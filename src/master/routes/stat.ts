import { Request, Router } from "express";
import { isValidObjectId, PipelineStage, Types } from "mongoose";
import { Job } from "../../models/job";
import { Request as RequestCollection } from "../../models/request";
import { auth } from "../middlewares/auth";

export const statRouter = Router();

const buildStatAggregationPipeline = (requestId: Types.ObjectId): PipelineStage[] => {
  return [
    {
      '$match': {
        'request': requestId,
      }
    }, {
      '$group': {
        '_id': {
          'status': '$status', 
          'valid': '$verificationResult'
        }, 
        'count': {
          '$sum': 1
        }
      }
    }, {
      '$group': {
        '_id': '$_id.status', 
        'result': {
          '$push': {
            'valid': '$_id.valid', 
            'count': '$count'
          }
        }
      }
    }, {
      '$unwind': {
        'path': '$result', 
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$project': {
        '_id': 0, 
        'status': '$_id', 
        'valid': '$result.valid', 
        'count': '$result.count'
      }
    }
  ]
}

statRouter.get("/stat/:requestId", auth, async (req: Request, res) => {
  const requestId = new Types.ObjectId(req.params.requestId);
  if (!isValidObjectId(requestId)) {
    return res.status(400).send('invalid request id');
  }
  const request = await RequestCollection.findById(requestId);
  if (!request) {
    return res.status(404).send('request not found');
  }

  const aggregated = await Job.aggregate(buildStatAggregationPipeline(requestId))

  res.send(aggregated.sort((a, b) => a.status.localeCompare(b.status)));
});