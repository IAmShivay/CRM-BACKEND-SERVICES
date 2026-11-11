import { Request, Response } from "express";
import { DEFAULT_ITEM_UNIT } from "@crm-platform/shared-types";
import { Quotation } from "../models/Quotation";
import { Invoice } from "../models/Invoice";
import { Contact } from "../models/Contact";
import { calculateInvoiceTotals, invoicePrefixFor, formatInvoiceNumber, nextSequenceFrom } from "../utils/gst";

export const getQuotations = async (req: Request, res: Response) => {
  try {
    const { workspaceId, status, contactId, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (status) filter.status = status;
    if (contactId) filter.contactId = contactId;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [quotations, total] = await Promise.all([
      Quotation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Quotation.countDocuments(filter),
    ]);

    res.json({
      success: true,
      quotations,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch quotations" });
  }
};

export const getQuotationById = async (req: Request, res: Response) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    res.json({ success: true, quotation });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch quotation" });
  }
};

export const createQuotation = async (req: Request, res: Response) => {
  try {
    const quotation = await Quotation.create({
      ...req.body,
      createdBy: (req as any).user?.userId,
    });
    res.status(201).json({ success: true, quotation });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create quotation" });
  }
};

export const updateQuotation = async (req: Request, res: Response) => {
  try {
    const quotation = await Quotation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    res.json({ success: true, quotation });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update quotation" });
  }
};

export const deleteQuotation = async (req: Request, res: Response) => {
  try {
    const quotation = await Quotation.findByIdAndDelete(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    res.json({ success: true, message: "Quotation deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete quotation" });
  }
};

export const acceptQuotation = async (req: Request, res: Response) => {
  try {
    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      { status: "accepted" },
      { new: true }
    );
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    res.json({ success: true, quotation });
  } catch (error) {
    res.status(500).json({ message: "Failed to accept quotation" });
  }
};

export const rejectQuotation = async (req: Request, res: Response) => {
  try {
    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    res.json({ success: true, quotation });
  } catch (error) {
    res.status(500).json({ message: "Failed to reject quotation" });
  }
};

export const convertToInvoice = async (req: Request, res: Response) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    if (quotation.convertedToInvoiceId) {
      return res.status(400).json({ message: "Quotation already converted to invoice" });
    }

    const prefix = invoicePrefixFor("tax_invoice");
    const lastInvoice = await Invoice.findOne({ workspaceId: quotation.workspaceId, invoiceNumber: { $regex: `^${prefix}/` } })
      .sort({ createdAt: -1 })
      .select("invoiceNumber")
      .lean();
    const invoiceNumber = formatInvoiceNumber(prefix, nextSequenceFrom((lastInvoice as any)?.invoiceNumber));

    const contact = quotation.contactId ? await Contact.findById(quotation.contactId).select("name email phone address").lean() : null;
    const totals = calculateInvoiceTotals(
      quotation.items.map((item: any) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit: DEFAULT_ITEM_UNIT,
        rate: item.unitPrice,
        discount: 0,
        discountType: "flat" as const,
        taxRate: item.tax || 0,
      })),
      false
    );

    const invoice = await Invoice.create({
      workspaceId: quotation.workspaceId,
      invoiceNumber,
      type: "tax_invoice",
      status: "draft",
      contactId: quotation.contactId,
      customerName: (contact as any)?.name || `Quotation ${quotation.quotationNumber}`,
      customerEmail: (contact as any)?.email,
      customerPhone: (contact as any)?.phone,
      customerAddress: (contact as any)?.address,
      dealId: quotation.dealId,
      quoteId: quotation._id.toString(),
      ...totals,
      amountPaid: 0,
      amountDue: totals.grandTotal,
      currency: quotation.currency,
      isInterState: false,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: quotation.notes,
      termsAndConditions: quotation.terms,
      reminders: [],
      createdBy: req.user!.userId,
    });

    await Quotation.findByIdAndUpdate(req.params.id, {
      status: "converted",
      convertedToInvoiceId: invoice._id,
    });

    res.status(201).json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ message: "Failed to convert quotation to invoice" });
  }
};

export const sendQuotation = async (req: Request, res: Response) => {
  try {
    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      { status: "sent", sentAt: new Date() },
      { new: true }
    );
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    res.json({ success: true, quotation, message: "Quotation marked as sent" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send quotation" });
  }
};
