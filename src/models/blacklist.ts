import mongoose, { Document, Model, Schema } from 'mongoose';

export interface BlacklistProps {
  provider: string;
  ip: string;
  note?: string;
}

export interface BlacklistDocument extends BlacklistProps, Document {}

interface BlacklistModel extends Model<BlacklistDocument> {
  build(props: BlacklistProps): BlacklistDocument;
  add(provider: string, ip: string, note?: string): Promise<BlacklistDocument>;
  contains(provider: string, ip: string): Promise<boolean>;
  findByIP(ip: string): Promise<BlacklistDocument[]>;
}

const BlacklistSchema = new Schema<BlacklistDocument, BlacklistModel>(
  {
    provider: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      required: true,
    },
    note: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

BlacklistSchema.statics.build = (props: BlacklistProps) => {
  return new Blacklist(props);
}

BlacklistSchema.statics.add = async (provider: string, ip: string, note?: string) => {
  const blacklist = await Blacklist.findOne({ provider, ip });
  if (blacklist) {
    return blacklist;
  }
  return Blacklist.create({ provider, ip, note });
}

BlacklistSchema.statics.contains = async (provider: string, ip: string) => {
  const blacklist = await Blacklist.findOne({ provider, ip });
  return !!blacklist;
}

BlacklistSchema.statics.findByIP = async (ip: string): Promise<BlacklistDocument[]> => {
  return Blacklist.find({ ip });
}

export const Blacklist = mongoose.model<BlacklistDocument, BlacklistModel>('Blacklist', BlacklistSchema);
