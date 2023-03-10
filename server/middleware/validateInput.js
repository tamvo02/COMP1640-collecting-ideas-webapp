// Dependence for remove file
const fs = require('fs');

exports.checkInput = (req) => {
    for(var prop in req.body) {
        if (req.body[prop].trim().length === 0) {
            return true
        }
    }
    return false
}

exports.checkTime = (req) => {
    var d1 = new Date(req.body.closureDate);
    var d2 = new Date(req.body.finalClosureDate);
    var diff_date_in_date = d2.getDate() - d1.getDate();
    var diff_date_in_time = d2.getTime() - d1.getTime();
    if (diff_date_in_date <= 0 && diff_date_in_time <= 0) {
        return true;
    }
    return false;
}

exports.checkFilePath = (object) => {
    if (object.filePath) {
        fs.unlink(object.filePath, function(err) {
            if(err && err.code == 'ENOENT') {
                // file doens't exist
                console.info("File doesn't exist, won't remove it.");
            } else if (err) {
                // other errors, e.g. maybe we don't have enough permission
                console.error("Error occurred while trying to remove file");
            } else {
                console.info(`File removed`);
            }
        });
    } else if (object.profileImage) {
        fs.unlink(object.profileImage, function(err) {
            if(err && err.code == 'ENOENT') {
                // file doens't exist
                console.info("File doesn't exist, won't remove it.");
            } else if (err) {
                // other errors, e.g. maybe we don't have enough permission
                console.error("Error occurred while trying to remove file");
            } else {
                console.info(`File removed`);
            }
        });
    }
}