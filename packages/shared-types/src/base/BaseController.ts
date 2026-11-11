import { Request, Response } from 'express'

export abstract class BaseController {
  protected getWorkspaceId(req: Request): string {
    return (req.query.workspaceId || req.body?.workspaceId || req.params.workspaceId || req.headers['x-workspace-id']) as string
  }

  protected getUserId(req: Request): string {
    return (req as any).user?.userId || ''
  }

  protected sendSuccess(res: Response, data: any, status = 200) {
    res.status(status).json({ success: true, ...data })
  }

  protected sendError(res: Response, message: string, status = 500) {
    res.status(status).json({ message })
  }

  protected sendPaginated(res: Response, items: any[], total: number, page: number, limit: number) {
    res.json({
      success: true,
      ...items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
  }
}
