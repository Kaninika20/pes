import { Request, Response, NextFunction } from 'express';

export const submitEvaluation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(410).json({
      error:
        "This endpoint is deprecated. Use /api/student/submit-peer-evaluation for assigned peer reviews.",
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
