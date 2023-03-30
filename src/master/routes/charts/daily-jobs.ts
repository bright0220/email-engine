import { Router } from "express";
import { Job } from "../../../models/job";
import { auth } from "../../middlewares/auth";
import moment from "moment";

export const dailyJobsRouter = Router();

dailyJobsRouter.get("/daily-jobs", auth, async (req, res) => {
  const rows = await Job.aggregate([
    {
      '$match': {
        'createdAt': {
          '$gte': moment().subtract(1, 'months').toDate(),
        }
      }
    },
    {
      $project: {
        reason: 1,
        createdAt: {
          $dateToString: {
            format: "%Y-%m-%d",
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