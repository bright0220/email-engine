import { Router } from "express";
import moment from "moment";
import { Job } from "../../../models/job";


export const monthlyJobsRouter = Router();

monthlyJobsRouter.get("/monthly-jobs", async (req, res) => {
  const rows = await Job.aggregate([
    {
      '$match': {
        'createdAt': {
          '$gte': moment().subtract(1, 'years').toDate(),
        }
      }
    },
    {
      $project: {
        reason: 1,
        createdAt: {
          $dateToString: {
            format: "%Y-%m",
            date: "$createdAt",
          },
        },
      }
    },
    {
      '$group': {
        '_id': {
          'createdAt': '$createdAt', 
          'reason': '$reason'
        }, 
        'count': {
          '$sum': 1
        }
      }
    }, {
      '$group': {
        '_id': '$_id.createdAt', 
        'result': {
          '$push': {
            'reason': '$_id.reason', 
            'count': '$count'
          }
        }
      }
    }
  ]);
  res.json(rows);
});