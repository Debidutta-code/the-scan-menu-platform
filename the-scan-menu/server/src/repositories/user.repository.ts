import { ClientSession, Types } from 'mongoose';
import { User, IUser } from '../models/User';

export class UserRepository {
  async findByEmail(email: string, session?: ClientSession): Promise<IUser | null> {
    return User.findOne({ email: (email || '').trim().toLowerCase() }, null, { session });
  }

  async findById(id: string | Types.ObjectId, session?: ClientSession): Promise<IUser | null> {
    return User.findById(id, null, { session });
  }

  async findOne(query: Record<string, any>, session?: ClientSession): Promise<IUser | null> {
    return User.findOne(query, null, { session });
  }

  async find(query: Record<string, any> = {}, session?: ClientSession): Promise<IUser[]> {
    return User.find(query, null, { session });
  }

  async create(userData: Partial<IUser>, session?: ClientSession): Promise<IUser> {
    const user = new User(userData);
    return user.save({ session });
  }

  async save(user: IUser, session?: ClientSession): Promise<IUser> {
    return user.save({ session });
  }

  async update(id: string | Types.ObjectId, updateData: Partial<IUser>, session?: ClientSession): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, updateData, { new: true, session });
  }

  async delete(id: string | Types.ObjectId, session?: ClientSession): Promise<boolean> {
    const result = await User.deleteOne({ _id: id }, { session });
    return result.deletedCount > 0;
  }
}

export const userRepository = new UserRepository();

