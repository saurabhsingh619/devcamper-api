const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan')
const colors = require('colors')
const connectDB = require('./config/db')
const errorHandler = require('./middleware/error')
const fileupload = require('express-fileupload')
const cookieParser = require('cookie-parser')
const path = require('path')
const mongoSanitize = require('express-mongo-sanitize')
const helmet = require('helmet')
const xss = require('xss-clean')
const rateLimit = require('express-rate-limit')
const hpp = require('hpp')
const cors = require('cors');

//load env vars
dotenv.config({path : './config/config.env'})

//Connect to Database
connectDB();

//Route files
const bootcamps = require('./routes/bootcamps')
const courses = require('./routes/courses')
const auth = require('./routes/auth')
const users = require('./routes/users')
const reviews = require('./routes/reviews')

const app = express();

//body parser
app.use(express.json());

//cookie parser
app.use(cookieParser());

//dev logging middleware
if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'))
}

//sanitize data
app.use(mongoSanitize());

//set security headers
app.use(helmet({ contentSecurityPolicy: false }));

//prevent xss attacks
app.use(xss());

//Rate limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, //10 mins
    max: 100
});
app.use(limiter);

//prevent http param pollution
app.use(hpp());

//Enable CORS
app.use(cors());


//File uploading
app.use(fileupload());

//Set static folder
app.use(express.static(path.join(__dirname,'public')));


//Mount Routers
app.use('/api/v1/bootcamps',bootcamps);
app.use('/api/v1/courses',courses);
app.use('/api/v1/auth',auth);
app.use('/api/v1/users',users);
app.use('/api/v1/reviews',reviews);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(
    PORT,
    console.log(`Server running on ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold)
);

//Handle unhandled promise rejections
process.on('unhandledRejection',(err,promise) => {
    console.log(`Error: ${err.message}`.red)
    //close server and exit process
    server.close(() => process.exit(1))
})