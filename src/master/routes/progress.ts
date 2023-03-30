import { Request, Router } from "express";
import { isValidObjectId, PipelineStage, Types } from "mongoose";
import { config } from "../../config";
import { Job, JobStatus } from "../../models/job";
import { Request as RequestCollection } from "../../models/request";
import { ResultType } from '../../worker/base-validator';
import { auth } from "../middlewares/auth";
export const progressRouter = Router();

const buildStatAggregationPipeline = (requestId: Types.ObjectId): PipelineStage[] => {
  return [
    {
      '$match': {
        'request': requestId,
      }
    }, {
      '$group': {
        '_id': '$reason', 
        'count': {
          '$sum': 1
        }
      }
    }, {
      '$project': {
        '_id': 0, 
        'reason': '$_id', 
        'count': 1
      }
    }
  ]
}

const checkMaxAttemptReached = async (requestId: Types.ObjectId): Promise<boolean> => {
  const failedJobCount = await Job.countDocuments({ request: requestId, status: JobStatus.FAILED });
  const failedAttemtRows = await Job.aggregate([{
    '$match': {
      'request': requestId,
    }
  }, {
    '$group': {
      'attemptCount': {
        '$sum': config.HTTP_JOB_MAX_TRY,
      },
    }
  }]);
  const [failedAttemtRow] = failedAttemtRows;
  const failedAttemptCount = failedAttemtRow ? failedAttemtRow.attemptCount : 0;
  return failedJobCount * config.HTTP_JOB_MAX_TRY === failedAttemptCount;
}

progressRouter.get("/requests/:requestId/progress", auth, async (req: Request, res) => {
  const requestId = new Types.ObjectId(req.params.requestId);
  // console.log('requestId', requestId);
  const request = await RequestCollection.findById(requestId);
  if (!request) {
    return res.status(404).send('request not found');
  }
  
  let status: 'finished' | 'running' = request.totalCount === request.completedCount ? 'finished' : 'running';

  const lastUpdatedJob = await Job.findOne({ request: requestId }).sort({ updatedAt: -1 });
  if (!lastUpdatedJob) {
    throw new Error('last updated job not found');
  }
  const runtime = ((request.lastValidatedAt || lastUpdatedJob?.updatedAt).getTime() - request.createdAt.getTime()) / 1000;

  const aggregates = await Job.aggregate(buildStatAggregationPipeline(requestId));
  // as { reason: string; count: number }[];
  res.json({
    _id: request._id,
    status,
    name: request.name,
    createdAt: request.createdAt,
    uploaded: request.totalCount,
    aggregate: aggregates.reduce((acc, cur) => {
      acc[cur.reason] = cur.count;
      return acc;
    }, {} as { [key: string]: number }),
    processed: request.completedCount,
    exports: {
      overall: `http://95.216.198.65:3101/api/reports/${requestId}`,
      ok: `http://95.216.198.65:3101/api/reports/${requestId}?reason=${ResultType.VALID}`,
      ok_for_all: `http://95.216.198.65:3101/api/reports/${requestId}?reason=${ResultType.CATCH_ALL}`,
    },
    responseScore: aggregates.reduce((acc, cur) => {
      acc[cur.reason] = Number((cur.count / request.totalCount * 100).toFixed(2));
      return acc;
    }, {} as { [key: string]: number }),
    completed: request.completedCount === request.totalCount,
    completionTime: request.lastValidatedAt || lastUpdatedJob?.updatedAt,
    paused: request.paused,
    runtime,
  })
});