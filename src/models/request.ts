import mongoose, { Document, Model, Schema } from 'mongoose';

interface RequestProps {
  name: string;
  completedCount: number;
  totalCount: number;
  uploadedFilename?: string;
  paused: boolean;
  lastValidatedAt?: Date;
  hasExtra?: boolean;
  extraColumnCount?: number;
}

export interface RequestDocument extends RequestProps, Document {
  createdAt: Date;
  updatedAt: Date;
}

interface RequestModel extends Model<RequestDocument> {
  build(props: RequestProps): RequestDocument;
  incrementCompletedCount(id: string): Promise<void>;
}

const RequestSchema = new Schema<RequestDocument, RequestModel>({
  name: {
    type: String,
  },
  completedCount: {
    type: Number,
    default: 0,
  },
  totalCount: {
    type: Number,
    default: 0,
  },
  uploadedFilename: {
    type: String,
    default: null,
  },
  paused: {
    type: Boolean,
    default: false,
  },
  lastValidatedAt: {
    type: Date,
  },
  hasExtra: {
    type: Boolean,
    default: false,
  },
  extraColumnCount: {
    type: Number,
    default: 0,
  },
},{
  timestamps: true
});

RequestSchema.statics.build = (props: RequestProps) => {
  return new Request(props);
};

RequestSchema.statics.incrementCompletedCount = async (id: string) => {
  await Request.updateOne({ _id: id}, { $inc: { completedCount: 1 }, $set: { lastValidatedAt: new Date() } });
}

export const Request = mongoose.model<RequestDocument, RequestModel>('Request', RequestSchema);