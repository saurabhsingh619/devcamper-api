const geocoder = require('../utils/geocoder')
const Bootcamp = require('../models/Bootcamp')
const ErrorResponse = require('../utils/errorResponse')
const asyncHandler = require('../middleware/async')
const path = require('path')

//@desc get all bootcamps
//@route GET /api/v1/bootcamps
//@access public
exports.getBootcamps = asyncHandler( async (req,res, next) => {

        res.status(200).json(res.advancedResults)
});

//@desc get single bootcamps
//@route GET /api/v1/bootcamps/:id
//@access public
exports.getBootcamp = asyncHandler(async (req,res, next) => {
        const bootcamp = await Bootcamp.findById(req.params.id)
        if(!bootcamp){
            return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
        }
        res.status(200).json({
            success:true,
            data: bootcamp
        })
});

//@desc create new bootcamp
//@route GET /api/v1/bootcamps
//@access private
exports.createBootcamp = asyncHandler(async (req,res, next) => {

        //Add user to re.body
        req.body.user = req.user.id;

        //check for published bootcamp
        const publishedBootcamp = await Bootcamp.findOne({user: req.user.id});
        //if user is not admin, they can add only one bootcamp
        if(publishedBootcamp && req.user.role !== 'admin'){
            return next(new ErrorResponse(`The user with ID ${req.user.id} has already published a bootcamp`, 400));
        }
        
        const bootcamp = await Bootcamp.create(req.body)
        res.status(201).json({
            success:true,
            data: bootcamp
        });
});

//@desc update bootcamp
//@route PUT /api/v1/bootcamps/:id
//@access private
exports.updateBootcamp = asyncHandler(async (req,res, next) => {
        let bootcamp = await Bootcamp.findById(req.params.id)
        if(!bootcamp){
            return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
        }

        //make sure user is owner of bootcamp
        if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin'){
            return next(new ErrorResponse(`User ${req.params.id} is not authorized to update this bootcamp`, 401));
        }

        bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })

        res.status(200).json({
            success:true,
            data: bootcamp
        })
});

//@desc delete bootcamp
//@route DELETE /api/v1/bootcamps/:id
//@access private
exports.deleteBootcamp = asyncHandler(async (req,res, next) => {
        const bootcamp = await Bootcamp.findById(req.params.id)
        if(!bootcamp){
            return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)); 
        }

        //make sure user is owner of bootcamp
        if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin'){
            return next(new ErrorResponse(`User ${req.params.id} is not authorized to delete this bootcamp`, 401));
        }

        bootcamp.remove()
        res.status(200).json({
            success:true,
            data: {}
        })
});

//@desc Get bootcamps within a radius
//@route GET /api/v1/bootcamps/:zipcode/:distance
//@access private
exports.getBootcampsInRadius = asyncHandler(async (req,res, next) => {
    const {zipcode, distance} = req.params

    //get lat/lng from geocoder
    const loc = await geocoder.geocode(zipcode);
    const lat = loc[0].latitude;
    const lng = loc[0].longitude;

    //calc radius using radians
    //divide distance by radius of earth
    //Earth radius = 3963 mi / 6378 km
    const radius = distance / 3963;

    const bootcamps = await Bootcamp.find({
        location: { $geoWithin: {$centerSphere: [ [lng, lat], radius]}}
    });
    console.log("lat/lon: ",lat,lng)

    res.status(200).json({
        success: true,
        count: bootcamps.length,
        data: bootcamps
    })

});

//@desc Upload photo for a bootcamp
//@route PUT /api/v1/bootcamps/:id/photo
//@access private
exports.bootcampPhotoUpload = asyncHandler(async (req,res, next) => {
    const bootcamp = await Bootcamp.findById(req.params.id)
    if(!bootcamp){
        return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)); 
    }

    //make sure user is owner of bootcamp
    if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin'){
        return next(new ErrorResponse(`User ${req.params.id} is not authorized to update this bootcamp`, 401));
    }

    if(!req.files){
        return next(new ErrorResponse(`Please upload a file`, 400)); 
    }
    const file = req.files.file;

    //Make sure the file is photo
    if(!file.mimetype.startsWith('image')){
        return next(new ErrorResponse(`Please upload an image file`, 400));
    }

    //check file size
    if(file.size > process.env.MAX_FILE_UPLOAD){
        return next(new ErrorResponse(`Please upload an image file less than ${process.env.MAX_FILE_UPLOAD}`, 400));
    }

    //Create custom filename
    file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;

    file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
        if(err){
            console.error(err);
            return next(new ErrorResponse(`Problem with file upload`, 500));
        }
        await Bootcamp.findByIdAndUpdate(req.params.id, {photo: file.name});

        res.status(200).json({
            success: true,
            data: file.name
        })
    })


});