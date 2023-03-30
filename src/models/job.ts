import mongoose, { Document, Model, Schema } from 'mongoose';
import { ResultType } from '../worker/base-validator';
import { Request, RequestDocument } from './request';

export enum JobStatus {
  REQUESTED = 'REQUESTED',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
}

const statuses = Object.values(JobStatus);

interface AttemptData {
  validatedRelay: string;
  validatedWorker: string;
  validationTime: number;
  validationMethod: string;
}

interface CustomValidationResult {
  valid: boolean;
  regex?: {
    valid: boolean;
    reason?: string;
  };
  typo?: {
    valid: boolean;
    reason?: string;
  };
  disposable?: {
    valid: boolean;
    reason?: string;
  };
  mx?: {
    valid: boolean;
    reason?: string;
  };
  smtp?: {
    valid: boolean;
    reason?: string;
    messages?: string[];
  };
}

export interface JobProps {
  request: RequestDocument | string;
  email: string;
  status: JobStatus;
  verificationResult?: boolean;
  error?: string;
  reason?: string;
  attemptCount?: number;
  attempts?: {
    ip: string;
    date: Date;
    reason?: ResultType;
    validatedRelay?: string,
    validatedWorker?: string,
    validationTime?: number,
    validationMethod?: string,
    customValidationResult?: CustomValidationResult;
  }[],
  extra?: {
    [key: string]: string;
  },
}

export interface JobDocument extends JobProps, Document {
  createdAt: Date;
  updatedAt: Date;
}

interface JobModel extends Model<JobDocument> {
  build(props: JobProps): JobDocument;
  completed(id: string, verificationResult: boolean, ip: string, reason: string, customValidationResult: CustomValidationResult | undefined, attemptData: Partial<AttemptData>): Promise<JobDocument>;
  failed(id: string, error: string, ip: string, customValidationResult: CustomValidationResult | undefined, attemptData: Partial<AttemptData>): Promise<JobDocument>;
}

const JobSchema = new Schema<JobDocument, JobModel>(
  {
    request: {
      type: Schema.Types.ObjectId,
      ref: 'Request',
    },
    email: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: statuses,
    },
    verificationResult: {
      type: Boolean,
    },
    error: {
      type: String,
    },
    reason: {
      type: String,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    attempts: [
      {
        ip: {
          type: String,
          required: true,
        },
        date: {
          type: Date,
          required: true,
        },
        reason: {
          type: String,
          required: true,
        },
        validatedRelay: {
          type: String,
        },
        validatedWorker: {
          type: String,
        },
        validationTime: {
          type: Number,
        },
        validationMethod: {
          type: String,
        },
        customValidationResult: {
          valid: {
            type: Boolean,
            required: true,
          },
          regex: {
            valid: Boolean,
            reason: String,
          },
          typo: {
            valid: Boolean,
            reason: String,
          },
          disposable: {
            valid: Boolean,
            reason: String,
          },
          mx: {
            valid: Boolean,
            reason: String,
          },
          smtp: {
            valid: Boolean,
            reason: String,
            messages: [String],
          },
        },
      }
    ],
    extra: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

JobSchema.statics.build = (props: JobProps) => {
  return new Job(props);
}

JobSchema.statics.completed = async (id: string, verificationResult: boolean, ip: string, reason: string, customValidationResult: CustomValidationResult | undefined, attemptData?: AttemptData) => {
  const job = await Job.findById(id).select({ request: 1 });
  if (!job) {
    throw new Error('Job not found');
  }
  let fixedCustomValidationResult: CustomValidationResult | undefined;
  if (customValidationResult) {
    fixedCustomValidationResult = {
      ...customValidationResult,
    };
    if (customValidationResult.smtp) {
      fixedCustomValidationResult.smtp = {
        ...customValidationResult.smtp,
      };
      if (customValidationResult.smtp.reason) {
        fixedCustomValidationResult.smtp.reason = customValidationResult.smtp.reason.toString();
      }
    }
  }

  await Request.incrementCompletedCount(job.request.toString());
  await Job.updateOne({
    _id: id,
    status: {
      $ne: JobStatus.COMPLETED
    }
  }, {
    $set: {
      status: JobStatus.COMPLETED,
      verificationResult,
      reason: reason,
    },
    $inc: {
      attemptCount: 1
    },
    $push: {
      attempts: {
        ip,
        date: new Date(),
        customValidationResult: fixedCustomValidationResult,
        reason,
        ...attemptData || {},
      }
    }
  });
}

JobSchema.statics.failed = async (id: string, error: string, ip: string, customValidationResult: CustomValidationResult | undefined, attemptData?: AttemptData) => {
  let customResult: CustomValidationResult | undefined;
  if (customValidationResult) {
    customResult = {
      ...customValidationResult,
    };
    if (customValidationResult.smtp) {
      customResult.smtp = {
        ...customValidationResult.smtp,
      };
      if (customValidationResult.smtp.reason) {
        customResult.smtp.reason = customValidationResult.smtp.reason.toString();
      }
    }
  }
  return Job.updateOne({
    _id: id,
    status: {
      $ne: JobStatus.COMPLETED
    }
  }, {
    $set: {
      status: JobStatus.FAILED,
      error,
      reason: error,
    },
    $inc: {
      attemptCount: 1
    },
    $push: {
      attempts: {
        ip,
        reason: error,
        date: new Date(),
        customValidationResult: customResult,
        ...attemptData || {},
      }
    }
  });
}

export const Job = mongoose.model<JobDocument, JobModel>('Job', JobSchema);
