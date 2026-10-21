import session from 'express-session';
import bodyParser from "body-parser";
import {Express} from "express";
import multer from 'multer';
const upload = multer();

export interface BindExpressUtilsOptions {
  /**
   * The largest request body the JSON and urlencoded parsers accept: bytes or a
   * `bytes` string (`"20mb"`). Anything bigger is refused with 413 before a
   * controller sees it. Left out, body-parser's own `100kb` applies.
   */
  bodyLimit?: string | number;
}

export default function bindExpressUtils(app: Express, options: BindExpressUtilsOptions = {}) {
  /** Bind express session */
  app.use(
    session({
      secret: 'adminizer-secret',
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24, // session expire in 1 day
      },
    })
  );

  /** Bind multer (important: before body-parser) */
  // app.use(upload.none()); // Processes form-data without files

  /**
   * Bind body-parser. These run before the access policies, so the limit is also
   * what an anonymous request may make the server read: it is raised by the
   * project that needs it (`bodyLimit`), never by default.
   */
  const limit = options.bodyLimit;
  app.use(bodyParser.urlencoded({ extended: true, ...(limit !== undefined && { limit }) })); // To process application/x-www-form-urlencoded
  app.use(bodyParser.json(limit !== undefined ? { limit } : undefined)); // To process JSON

  /** Bind static files */
  // app.use('/static', adminizer.express.static('public'));
}
