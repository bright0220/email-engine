import { Request, Response, Router } from "express";
import Joi from "joi";
import { FilterQuery, ObjectId, PipelineStage, Types } from "mongoose";
import { Job } from "../../../models/job";
import { Request as RequestCollection, RequestDocument } from "../../../models/request";
import { auth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validator";

export const requestsListRouter = Router();

enum Status {
  running = "running",
  completed = "completed",
}

const schema = Joi.object({
  page: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).max(100).required(),
  status: Joi.string().valid(Status.running, Status.completed).optional(),
})

interface Query {
  page: number;
  limit: number;
  status?: Status;
}

requestsListRouter.get("/", auth, validate(schema), async (req: Request<unknown, unknown, unknown, Query>, res: Response) => {
  const { page, limit, status } = req.query;
  const query: FilterQuery<RequestDocument> = {
    $and: [{ totalCount: { $gt: 0 } }],
  };
  if (status === Status.completed) {
    query.$and!.push({
      $expr: {
        $gte: ['$completedCount', '$totalCount'],
      }
    });
  } else if (status === Status.running) {
    query.$and!.push({
      $expr: {
        $lt: ['$completedCount', '$totalCount'],
      }
    });
  }

  // console.log(req.path, 'query', query);
  const count = await RequestCollection.countDocuments(query);
  const rows = await RequestCollection.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  
  const requestIds = rows.map(row => row._id);
  const statAggregationPipeline = buildStatAggregationPipeline(requestIds);
  // console.log(req.path, 'statAggregationPipeline', JSON.stringify(statAggregationPipeline, null, 2));
  const statRows: {_id: Types.ObjectId, reasons: {reason: string, count: number}[] }[] = await Job.aggregate(statAggregationPipeline);
  // console.log(req.path, 'statRows', statRows)
  const statMap = new Map<string, {[key: string]: number}>();
  statRows.forEach(statRow => {
    const { _id, reasons } = statRow;
    const stat = reasons.reduce((acc, reason) => {
      acc[reason.reason] = reason.count;
      return acc;
    }, {} as {[key: string]: number});
    statMap.set(_id.toString(), stat);
  });
  // console.log(req.path, 'statMap', statMap)
  res.send({
    count,
    rows: rows.map(_row => {
      const row = _row.toJSON();
      const stat = statMap.get(row._id.toString());
      row.stat = stat;
      return row;
    })
  });
});


const buildStatAggregationPipeline = (requestIds: Types.ObjectId[]): PipelineStage[] => {
  return [
    {
      '$match': {
        'request': {
          '$in': requestIds
        }
      }
    },
    {
      '$group': {
        '_id': {
          'request': '$request', 
          'reason': '$reason'
        }, 
        'count': {
          '$sum': 1
        }
      }
    }, {
      '$group': {
        '_id': '$_id.request', 
        'reasons': {
          '$push': {
            'reason': '$_id.reason', 
            'count': '$count'
          }
        }
      }
    }
  ]
}