import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import paymentsRouter from "./payments";
import gamesRouter from "./games";
import blackjackRouter from "./blackjack";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(paymentsRouter);
router.use(gamesRouter);
router.use(blackjackRouter);

export default router;
