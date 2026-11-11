export abstract class BaseService {
  protected model: any

  constructor(model: any) {
    this.model = model
  }

  async findById(id: string) {
    return this.model.findById(id)
  }

  async findOne(query: Record<string, any>) {
    return this.model.findOne(query)
  }

  async find(query: Record<string, any>, options?: { sort?: any; limit?: number; skip?: number; populate?: string | string[] }) {
    let q = this.model.find(query)
    if (options?.sort) q = q.sort(options.sort)
    if (options?.skip) q = q.skip(options.skip)
    if (options?.limit) q = q.limit(options.limit)
    if (options?.populate) {
      const pops = Array.isArray(options.populate) ? options.populate : [options.populate]
      pops.forEach((p: string) => q = q.populate(p))
    }
    return q
  }

  async count(query: Record<string, any>) {
    return this.model.countDocuments(query)
  }

  async create(data: Record<string, any>) {
    return this.model.create(data)
  }

  async updateById(id: string, data: Record<string, any>) {
    return this.model.findByIdAndUpdate(id, data, { new: true })
  }

  async deleteById(id: string) {
    return this.model.findByIdAndDelete(id)
  }
}
