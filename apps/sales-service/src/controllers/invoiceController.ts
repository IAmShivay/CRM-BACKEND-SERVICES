import { Request, Response } from "express";
import mongoose from "mongoose";
import { DEFAULT_GST_RATE, DEFAULT_ITEM_UNIT } from "@crm-platform/shared-types";
import { Invoice } from "../models/Invoice";
import { PaymentRecord } from "../models/PaymentRecord";
import { Contact } from "../models/Contact";
import { Activity } from "../models/Activity";
import {
  calculateInvoiceTotals,
  isInterStateTransaction,
  invoicePrefixFor,
  formatInvoiceNumber,
  nextSequenceFrom,
} from "../utils/gst";

if (!mongoose.models.User) {
  mongoose.model("User", new mongoose.Schema({ fullName: String, email: String, avatarUrl: String }, { collection: "users" }));
}

const CONTACT_FIELDS = "name email phone company";
const USER_FIELDS = "fullName email";

function withItemDefaults(items: any[]) {
  return items.map((item) => ({
    ...item,
    unit: item.unit || DEFAULT_ITEM_UNIT,
    discount: item.discount || 0,
    discountType: item.discountType || "percentage",
    taxRate: item.taxRate ?? DEFAULT_GST_RATE,
  }));
}

function dateRange(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return undefined;
  const range: Record<string, Date> = {};
  if (dateFrom) range.$gte = new Date(dateFrom);
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return range;
}

async function nextInvoiceNumber(workspaceId: string, type?: string) {
  const prefix = invoicePrefixFor(type);
  const lastInvoice = await Invoice.findOne({ workspaceId, invoiceNumber: { $regex: `^${prefix}/` } })
    .sort({ createdAt: -1 })
    .select("invoiceNumber")
    .lean();
  const sequence = nextSequenceFrom((lastInvoice as any)?.invoiceNumber);
  return { invoiceNumber: formatInvoiceNumber(prefix, sequence), sequence };
}

async function logActivity(workspaceId: string, userId: string, activityType: string, entityId: string, description: string, metadata: Record<string, any> = {}) {
  await Activity.create({ workspaceId, performedBy: userId, activityType, entityType: "invoice", entityId, description, metadata }).catch(() => undefined);
}

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const { workspaceId, status, type, contactId, search, dateFrom, dateTo, page = "1", limit = "20", sortBy = "createdAt", sortOrder = "desc" } = req.query as Record<string, string>;

    const query: any = { workspaceId };
    if (status) query.status = status;
    if (type) query.type = type;
    if (contactId) query.contactId = contactId;
    if (search) query.$text = { $search: search };
    const invoiceDate = dateRange(dateFrom, dateTo);
    if (invoiceDate) query.invoiceDate = invoiceDate;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const direction = sortOrder === "asc" ? 1 : -1;
    const sortable = ["createdAt", "invoiceDate", "dueDate", "grandTotal", "invoiceNumber"];
    const sortOption: any = search
      ? { score: { $meta: "textScore" } }
      : { [sortable.includes(sortBy) ? sortBy : "createdAt"]: direction };

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .select("invoiceNumber type status customerName customerEmail contactId invoiceDate dueDate grandTotal amountPaid amountDue currency createdAt")
        .populate("contactId", CONTACT_FIELDS)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum),
      Invoice.countDocuments(query),
    ]);

    res.json({
      success: true,
      invoices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const invoice = await Invoice.findOne({ _id: req.params.id, workspaceId })
      .populate("contactId", `${CONTACT_FIELDS}`)
      .populate("createdBy", USER_FIELDS);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const payments = await PaymentRecord.find({ invoiceId: req.params.id, workspaceId })
      .sort({ paymentDate: -1 })
      .populate("receivedBy", USER_FIELDS);

    res.json({ success: true, invoice, payments });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const userId = req.user!.userId;
    const { workspaceId } = data;

    const { invoiceNumber } = await nextInvoiceNumber(workspaceId, data.type);
    const buyerState = data.customerAddress?.state;
    const isInterState = isInterStateTransaction(data.sellerAddress?.state, buyerState);
    const totals = calculateInvoiceTotals(withItemDefaults(data.items), isInterState);

    const invoice = await Invoice.create({
      workspaceId,
      invoiceNumber,
      type: data.type || "tax_invoice",
      status: "draft",
      contactId: data.contactId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerGstin: data.customerGstin,
      customerAddress: data.customerAddress,
      sellerName: data.sellerName,
      sellerGstin: data.sellerGstin,
      sellerAddress: data.sellerAddress,
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      ...totals,
      amountPaid: 0,
      amountDue: totals.grandTotal,
      currency: data.currency,
      placeOfSupply: data.placeOfSupply || buyerState,
      isInterState,
      reverseCharge: data.reverseCharge || false,
      paymentTerms: data.paymentTerms,
      bankDetails: data.bankDetails,
      dealId: data.dealId,
      quoteId: data.quoteId,
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      termsAndConditions: data.termsAndConditions,
      isRecurring: data.isRecurring || false,
      recurringInterval: data.recurringInterval,
      reminders: [],
      createdBy: userId,
    });

    const populated = await Invoice.findById(invoice._id)
      .populate("contactId", CONTACT_FIELDS)
      .populate("createdBy", USER_FIELDS);

    await logActivity(workspaceId, userId, "created", invoice._id.toString(), `Created invoice ${invoiceNumber} for ${data.customerName} (${totals.grandTotal.toLocaleString()})`, { grandTotal: totals.grandTotal });

    res.status(201).json({ success: true, message: "Invoice created successfully", invoice: populated });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Invoice number already exists" });
    }
    res.status(400).json({ message: error?.message || "Failed to create invoice" });
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const invoice = await Invoice.findOne({ _id: req.params.id, workspaceId: data.workspaceId });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    if (invoice.status === "paid" && data.status !== "paid") {
      return res.status(400).json({ message: "Cannot modify a fully paid invoice" });
    }

    if (data.items) {
      const totals = calculateInvoiceTotals(withItemDefaults(data.items), invoice.isInterState);
      Object.assign(invoice, {
        ...totals,
        amountDue: Math.max(0, totals.grandTotal - invoice.amountPaid),
      });
    }

    const assignable = ["customerName", "customerEmail", "customerPhone", "customerGstin", "customerAddress", "status", "bankDetails", "sellerName", "sellerGstin", "sellerAddress", "referenceNumber", "placeOfSupply", "reverseCharge"] as const;
    for (const key of assignable) {
      if (data[key] !== undefined) (invoice as any)[key] = data[key];
    }
    const nullable = ["paymentTerms", "notes", "termsAndConditions", "internalNotes"] as const;
    for (const key of nullable) {
      if (data[key] !== undefined) (invoice as any)[key] = data[key];
    }
    if (data.dueDate) invoice.dueDate = new Date(data.dueDate);
    if (data.dueDate === null) invoice.dueDate = undefined;
    if (data.invoiceDate) invoice.invoiceDate = new Date(data.invoiceDate);

    await invoice.save();

    await logActivity(data.workspaceId, req.user!.userId, "updated", invoice._id.toString(), `Updated invoice ${invoice.invoiceNumber}`);

    res.json({ success: true, message: "Invoice updated successfully", invoice });
  } catch (error: any) {
    res.status(400).json({ message: error?.message || "Failed to update invoice" });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const invoice = await Invoice.findOne({ _id: req.params.id, workspaceId });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    if (invoice.status === "paid" || invoice.status === "partially_paid") {
      return res.status(400).json({ message: "Cannot delete an invoice with payments. Cancel it instead." });
    }

    await Promise.all([
      Invoice.findByIdAndDelete(req.params.id),
      PaymentRecord.deleteMany({ invoiceId: req.params.id }),
    ]);

    await logActivity(String(workspaceId), req.user!.userId, "deleted", req.params.id, `Deleted invoice ${invoice.invoiceNumber}`);

    res.json({ success: true, message: "Invoice deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete invoice" });
  }
};

export const recordPayment = async (req: Request, res: Response) => {
  try {
    const { workspaceId, amount, paymentDate, paymentMethod, referenceNumber, notes } = req.body;
    const userId = req.user!.userId;

    const invoice = await Invoice.findOne({ _id: req.params.id, workspaceId });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    if (invoice.status === "cancelled") {
      return res.status(400).json({ message: "Cannot record payment on a cancelled invoice" });
    }
    if (amount > invoice.amountDue) {
      return res.status(400).json({ message: `Payment amount (${amount}) exceeds amount due (${invoice.amountDue})` });
    }

    const payment = await PaymentRecord.create({
      workspaceId,
      invoiceId: req.params.id,
      amount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || "upi",
      referenceNumber,
      notes,
      receivedBy: userId,
    });

    invoice.amountPaid += amount;
    invoice.amountDue = Math.max(0, invoice.grandTotal - invoice.amountPaid);
    if (invoice.amountDue <= 0) {
      invoice.status = "paid";
      invoice.paidDate = new Date();
    } else {
      invoice.status = "partially_paid";
    }
    await invoice.save();

    if (invoice.contactId) {
      await Contact.findByIdAndUpdate(invoice.contactId, { $inc: { totalPayments: amount }, lastPaymentDate: new Date() }).catch(() => undefined);
    }

    await logActivity(workspaceId, userId, "updated", req.params.id, `Recorded payment of ${amount.toLocaleString()} on invoice ${invoice.invoiceNumber}`, { amount, paymentMethod: paymentMethod || "upi" });

    const fullyPaid = invoice.amountDue <= 0;
    res.json({
      success: true,
      message: fullyPaid ? "Payment recorded. Invoice fully paid." : `Payment recorded. ${invoice.amountDue.toLocaleString()} remaining`,
      payment,
      invoice,
    });
  } catch (error: any) {
    res.status(400).json({ message: error?.message || "Failed to record payment" });
  }
};

export const sendInvoice = async (req: Request, res: Response) => {
  try {
    const { workspaceId, channel = "email" } = req.body;
    const invoice = await Invoice.findOne({ _id: req.params.id, workspaceId });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    if (invoice.status === "cancelled") {
      return res.status(400).json({ message: "Cannot send a cancelled invoice" });
    }

    const now = new Date();
    if (invoice.status === "draft") invoice.status = "sent";
    invoice.sentAt = now;
    invoice.reminders.push({ sentAt: now, channel });
    await invoice.save();

    await logActivity(workspaceId, req.user!.userId, "updated", req.params.id, `Sent invoice ${invoice.invoiceNumber} via ${channel}`, { channel });

    res.json({ success: true, message: `Invoice sent via ${channel}`, invoice });
  } catch (error: any) {
    res.status(400).json({ message: error?.message || "Failed to send invoice" });
  }
};

export const getInvoiceAnalytics = async (req: Request, res: Response) => {
  try {
    const { workspaceId, dateFrom, dateTo } = req.query as Record<string, string>;
    const matchFilter: any = { workspaceId };
    const invoiceDate = dateRange(dateFrom, dateTo);
    if (invoiceDate) matchFilter.invoiceDate = invoiceDate;

    const [overview, byStatus, byMonth, overdueInvoices, topCustomers] = await Promise.all([
      Invoice.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            totalAmount: { $sum: "$grandTotal" },
            totalPaid: { $sum: "$amountPaid" },
            totalDue: { $sum: "$amountDue" },
            totalTax: { $sum: "$totalTax" },
            totalCgst: { $sum: "$cgst" },
            totalSgst: { $sum: "$sgst" },
            totalIgst: { $sum: "$igst" },
            avgInvoiceValue: { $avg: "$grandTotal" },
          },
        },
      ]),
      Invoice.aggregate([
        { $match: matchFilter },
        { $group: { _id: "$status", count: { $sum: 1 }, totalAmount: { $sum: "$grandTotal" }, totalDue: { $sum: "$amountDue" } } },
      ]),
      Invoice.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { year: { $year: "$invoiceDate" }, month: { $month: "$invoiceDate" } },
            count: { $sum: 1 },
            totalAmount: { $sum: "$grandTotal" },
            totalPaid: { $sum: "$amountPaid" },
            totalTax: { $sum: "$totalTax" },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 },
      ]),
      Invoice.find({ ...matchFilter, status: { $in: ["sent", "viewed", "overdue"] }, dueDate: { $lt: new Date() } })
        .select("invoiceNumber customerName grandTotal amountDue dueDate")
        .sort({ dueDate: 1 })
        .limit(10),
      Invoice.aggregate([
        { $match: { ...matchFilter, status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: "$customerName",
            totalInvoices: { $sum: 1 },
            totalAmount: { $sum: "$grandTotal" },
            totalPaid: { $sum: "$amountPaid" },
            totalDue: { $sum: "$amountDue" },
          },
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const stats = overview[0] || {
      totalInvoices: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalDue: 0,
      totalTax: 0,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 0,
      avgInvoiceValue: 0,
    };

    res.json({
      success: true,
      analytics: {
        overview: {
          ...stats,
          avgInvoiceValue: Math.round(stats.avgInvoiceValue || 0),
          collectionRate: stats.totalAmount > 0 ? Math.round((stats.totalPaid / stats.totalAmount) * 100) : 0,
        },
        byStatus: byStatus.map((s: any) => ({ status: s._id, count: s.count, totalAmount: s.totalAmount, totalDue: s.totalDue })),
        monthlyTrend: byMonth.reverse().map((m: any) => ({
          month: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
          count: m.count,
          totalAmount: m.totalAmount,
          totalPaid: m.totalPaid,
          totalTax: m.totalTax,
        })),
        overdueInvoices: overdueInvoices.map((inv: any) => ({
          ...inv.toJSON(),
          daysOverdue: Math.ceil((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
        })),
        topCustomers,
        gstSummary: { totalTax: stats.totalTax, cgst: stats.totalCgst, sgst: stats.totalSgst, igst: stats.totalIgst },
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch invoice analytics" });
  }
};

export const getNextInvoiceNumber = async (req: Request, res: Response) => {
  try {
    const { workspaceId, type } = req.query as Record<string, string>;
    const result = await nextInvoiceNumber(workspaceId, type);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ message: "Failed to get next invoice number" });
  }
};
