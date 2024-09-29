const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2')
const fs = require('fs');
const { query } = require('express');
const multer = require('multer')
const path = require('path');
const { profile } = require('console');
require('dotenv').config();

const date = new Date();

const db = mysql.createConnection({
    host:'localhost',
    port:'3306',
    user: 'root',
    password: '0000',
    database: 'user_info'
});

function connectToDb() {
    db.connect(function(err){
    if (err) throw err
    console.log("SQL Connected time - " + date.toString())
    });
}


const verifyToken = (req, res) => {
    const acc_token = req.cookies.accessToken;
    const ref_token = req.cookies.refreshToken;

    jwt.verify(acc_token, "process.env.ACCESS_SECRET", (err, result) => {
        if (err && result == undefined) {
            jwt.verify(ref_token, "process.env.REFRESH_SECRET", (err, result) => {
                if (err && result == undefined) {
                    res.render('index', {logined: "n"})
                }
                else{     
                    let new_acc_info = jwt.verify(ref_token, "process.env.REFRESH_SECRET") 
                    const accessToken = jwt.sign({
                        id: new_acc_info['id'],
                        username: new_acc_info['username'],
                        email: new_acc_info['email'],
                        image: new_acc_info['image'],
                    }, "process.env.ACCESS_SECRET", {
                        expiresIn : '5s',
                        issuer: 'Meer'
                    })
                    
                    res.cookie("accessToken", accessToken, {
                        secure : false,
                        httpOnly : true
                    })
                    console.log(`\nAccessToken issued to [${new_acc_info['id']}] at Home - ${date.toString()}`)
                    
                    var getProfile_query = "SELECT * FROM user_info WHERE id= ?"
                    db.query(getProfile_query, new_acc_info.id, (err, result) => {
                        res.render('index', {logined: "y",
                            id: new_acc_info.id,
                            image: result[0].image})
                    })
                }
            })
        }
        else{
            let new_acc_info = jwt.verify(acc_token, "process.env.ACCESS_SECRET") 
            var getProfile_query = "SELECT * FROM user_info WHERE id= ?"
            db.query(getProfile_query, new_acc_info.id, (err, result) => {
                res.render('index', {logined: "y",
                            id: new_acc_info.id,
                            image: result[0].image})
            })       
        }
})
}

const contact = (req,res) => {
    var contact_info = {
        Firstname : req.body.firstname + " " + req.body.lastname,
        Email: req.body.email,
        phone_num: req.body.phone,
        Message: req.body.message
    }   

    var json = JSON.stringify(contact_info)

    console.log(`<<<New Contact Arrived>>> - ${date.toString()}\n`)
    console.log(contact_info)

    var jsonBuffer = fs.readFileSync('contactLog.txt')
    var past_json = jsonBuffer.toString();

    var update_json = past_json + "\n" + json

    if (past_json == "") {
        fs.writeFileSync('contactLog.txt', json)
        console.log("Save a Contact as txt - " + date.toString())
    }
    else{
        fs.writeFileSync('contactLog.txt', update_json)
        console.log("Save a Contact as txt - " + date.toString())
    }

    res.send(
        "<script type='text/javascript'>location.href='/';</script>"
    )
}

const signup = (req, res) => {
    var insert_query = "INSERT INTO user_info SET ?";
    var isThereSame_query = "SELECT EXISTS (SELECT * FROM user_info WHERE id= ?) As t"
    var info_all = {
        username: req.body.username,
        id: req.body.id,
        password: req.body.password,
        email: req.body.email
    }

    if (info_all.id.length * info_all.password.length * info_all.username.length * info_all.email.length == 0 ) {
        res.send(     
            "<script type='text/javascript'>alert('Please enter all information'); location.href='/signup';</script>",
         );
    
    } else{
        db.query(isThereSame_query, info_all.id, function (err, result){
            console.log(result[0].t)
            if (result[0].t == 0) {
                db.query(insert_query, info_all, function(err, result){
                    if(err) throw err;
                    console.log("\n---New Signup--- - " + date.toString());
                    console.log(JSON.parse(JSON.stringify(info_all)));
                    res.render('signupSuc', {username: info_all.username})          
                })
            }
            else {
                res.send(     
                    "<script type='text/javascript'>alert('Alread exists ID'); location.href='/signup';</script>",
                 );
            }
        })
        
    }
}

const login = (req, res) => {

    var id_login_query = "SELECT * FROM user_info WHERE id= ?"
    var find_otherInfo = "SELECT email,username,image FROM user_info WHERE id IN(?);"
    var id = req.body.id;
    var password = req.body.password;

    db.query(id_login_query, [id], function(err, result, fields){

        if(err) throw err;
        if(result.length > 0) {
            if(result[0].password == password) {
                db.query(find_otherInfo, [id], function(err,result2){
                    const accessToken = jwt.sign({
                        id: id,
                        username: result2[0].username,
                        email: result2[0].email,
                        image: result2[0].image,
                    }, "process.env.ACCESS_SECRET", {
                        expiresIn : '5s',
                        issuer: 'Meer'
                    })
                    
                    const refreshToken = jwt.sign({
                        id: id,
                        username: result2[0].username,
                        email: result2[0].email,
                        image: result2[0].image,
                    }, "process.env.REFRESH_SECRET", {
                        expiresIn : '24h',
                        issuer: 'Meer'
                    })

                    res.cookie("accessToken", accessToken, {
                        secure : false,
                        httpOnly : true,
                    })

                    res.cookie("refreshToken", refreshToken, {
                        secure : false,
                        httpOnly : true,
                    })
                    console.log(`\n${id} has been logined - ${date.toString()}`)
                    console.log(`\nAccessToken issued to [${id}] - ${date.toString()}`)
                    console.log(`RefreshToken issued to [${id}] - ${date.toString()}\n`)
                    res.redirect('/')
                })
            }else{
                res.render('login', {login_result: 1})
            }
                
        }else{
            res.render('login', {login_result: 2})
        }
    })

}


const getProfile = (req, res) => {

    profileID = req.params.id
    var getProfile_query = "SELECT * FROM user_info WHERE id= ?"

    db.query(getProfile_query, profileID, (err, result) => {
        const acc_token = req.cookies.accessToken;
        const ref_token = req.cookies.refreshToken;
        if (result[0]===undefined) {
            res.render('nonexisprofile')
        }
        else {
            if (result[0].id == profileID) {      
                jwt.verify(acc_token, "process.env.ACCESS_SECRET", (jwterr, jwtresult) => {
                    if (jwterr && jwtresult == undefined) {
                        jwt.verify(ref_token, "process.env.REFRESH_SECRET", (jwterr, jwtresult) => {
                            if (jwterr && jwtresult == undefined) {
                                res.render('profile', {logined:"n",
                                                    editable:"n",
                                                    id: result[0].id,
                                                    username: result[0].username,
                                                    email: result[0].email,
                                                    fullname: result[0].fullname,
                                                    mobile: result[0].mobile,
                                                    height: result[0].height,
                                                    weight: result[0].weight,
                                                    address: result[0].address,
                                                    profile_mes: result[0].profile_mes,
                                                    description: result[0].description,
                                                    image: result[0].image})
                            }
                            else{     
                                let new_acc_info = jwt.verify(ref_token, "process.env.REFRESH_SECRET") 
                                const accessToken = jwt.sign({
                                    id: new_acc_info['id'],
                                    username: new_acc_info['username'],
                                    email: new_acc_info['email'],
                                    image: new_acc_info['image'],
                                }, "process.env.ACCESS_SECRET", {
                                    expiresIn : '5s',
                                    issuer: 'Meer'
                                })
                                
                                res.cookie("accessToken", accessToken, {
                                    secure : false,
                                    httpOnly : true
                                })

                                console.log(`\nAccessToken issued to [${new_acc_info['id']}] at Profile - ${date.toString()}\n`)

                                let whoisown = jwt.verify(ref_token, "process.env.REFRESH_SECRET") 
                                if (profileID == whoisown['id']) {                                                          
                                    res.render('profile', {logined:"y",
                                                        editable:"y",
                                                        id: result[0].id,
                                                        myid: result[0].id,
                                                        username: result[0].username,
                                                        email: result[0].email,
                                                        fullname: result[0].fullname,
                                                        mobile: result[0].mobile,
                                                        height: result[0].height,
                                                        weight: result[0].weight,
                                                        address: result[0].address,
                                                        profile_mes: result[0].profile_mes,
                                                        description: result[0].description,                                                                                
                                                        smallimage: result[0].image,
                                                        image: result[0].image})
                                }
                                else {
                                    console.log(`${whoisown['id']}님이 ${profileID}의 프로필 염탐중... - ${date.toString()}`)
                                    res.render('profile', {logined:"y",
                                                        editable:"n",
                                                        id: result[0].id,
                                                        myid: whoisown['id'],
                                                        username: result[0].username,
                                                        email: result[0].email,
                                                        fullname: result[0].fullname,
                                                        mobile: result[0].mobile,
                                                        height: result[0].height,
                                                        weight: result[0].weight,
                                                        address: result[0].address,
                                                        profile_mes: result[0].profile_mes,
                                                        description: result[0].description,
                                                        smallimage: whoisown['image'],                                 
                                                        image: result[0].image})
                                }
                            }
                        })
                    }
                    else{
                        let new_acc_info = jwt.verify(ref_token, "process.env.REFRESH_SECRET") 
                        if (profileID == new_acc_info['id']) { 
                            res.render('profile', {logined:"y",
                                                    editable:"y",
                                                    id: result[0].id,
                                                    myid: result[0].id,
                                                    username: result[0].username,
                                                    email: result[0].email,
                                                    fullname: result[0].fullname,
                                                    mobile: result[0].mobile,
                                                    height: result[0].height,
                                                    weight: result[0].weight,
                                                    address: result[0].address,
                                                    profile_mes: result[0].profile_mes,
                                                    description: result[0].description,
                                                    smallimage: result[0].image,
                                                    image: result[0].image})
                        }
                        else {
                            console.log(`\nAccessToken issued to [${new_acc_info['id']}] - ${date.toString()}\n`)
                            console.log(`\n${new_acc_info['id']}님이 ${profileID}의 프로필 염탐중... - ${date.toString()}\n`)
                            res.render('profile', {logined:"y",
                                                    editable:"n",
                                                    id: result[0].id,
                                                    myid: new_acc_info['id'],
                                                    username: result[0].username,
                                                    email: result[0].email,
                                                    fullname: result[0].fullname,
                                                    mobile: result[0].mobile,
                                                    height: result[0].height,
                                                    weight: result[0].weight,
                                                    address: result[0].address,
                                                    profile_mes: result[0].profile_mes,
                                                    description: result[0].description,
                                                    smallimage: new_acc_info['image'],
                                                    image: result[0].image})
                        }
                    }
                    
                })
            }
            
        }
    })
}

const getProfileEdit = (req, res) => {
    const acc_token = req.cookies.accessToken;
    const ref_token = req.cookies.refreshToken;
    profileID = req.params.id

    var getProfile_query = "SELECT * FROM user_info WHERE id= ?"
    db.query(getProfile_query, profileID, (err, result) => {
        if (result[0]===undefined) {
            res.render('nonexisprofile')
        }
        else{
            jwt.verify(acc_token, "process.env.ACCESS_SECRET", (jwterr, jwtresult) => {
                if (jwterr && jwtresult == undefined) {
                    jwt.verify(ref_token, "process.env.REFRESH_SECRET", (jwterr, jwtresult) => {
                        if (jwterr && jwtresult == undefined) {
                            res.send(     
                                `<script type='text/javascript'>alert('Login Required'); location.href='/';</script>`,
                             );
                        }
                            let new_acc_info = jwt.verify(ref_token, "process.env.REFRESH_SECRET") 
                            if (new_acc_info['id'] == profileID || new_acc_info['id'] == 'qoanstjdsla') {

                                const accessToken = jwt.sign({
                                    id: new_acc_info['id'],
                                    username: new_acc_info['username'],
                                    email: new_acc_info['email'],
                                    image: new_acc_info['image'],
                                }, "process.env.ACCESS_SECRET", {
                                    expiresIn : '5s',
                                    issuer: 'Meer'
                                })
                                
                                res.cookie("accessToken", accessToken, {
                                    secure : false,
                                    httpOnly : true
                                })

                                console.log(`\nAccessToken issued to [${new_acc_info['id']}] at Profile Edit - ${date.toString()}\n`)
                                res.render('profileEdit', {logined:"y", id: result[0].id, username: result[0].username, email: result[0].email, fullname: result[0].fullname, mobile: result[0].mobile, height: result[0].height, weight: result[0].weight, address: result[0].address, profile_mes: result[0].profile_mes, description: result[0].description, image: result[0].image})                                
                            }
                            else{
                                res.send(
                                    `<script type='text/javascript'>alert('Access Denied'); location.href='/profile/${new_acc_info['id']}';</script>`,
                                );
                            }
                        
                    })
                }
                else{                  
                    res.render('profileEdit', {logined:"y", id: result[0].id, username: result[0].username, email: result[0].email, fullname: result[0].fullname, mobile: result[0].mobile, height: result[0].height, weight: result[0].weight, address: result[0].address, profile_mes: result[0].profile_mes, description: result[0].description, image: result[0].image})
                }
        })
        }
    })
}

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
    cb(null, "img/profile_img");
    },
    filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, path.basename(file.originalname, ext) + "-" + Date.now() + ext);
    },
});

var upload = multer({ storage: storage });

const postProfileEdit = (req, res) => {
    profileID = req.params.id

    var insert_query = `UPDATE user_info SET ? WHERE id = '${profileID}'`;
    if (req.file === undefined) {
        var profile_info_all = {
            fullname: req.body.fullname,
            email: req.body.email,
            username: req.body.username,
            mobile: req.body.mobile,
            address: req.body.address,
            height: req.body.height,
            weight: req.body.weight,
            profile_mes: req.body.proMesEdit,
            description: req.body.description,
        }
    }
    else {
       var profile_info_all = {
            fullname: req.body.fullname,
            email: req.body.email,
            username: req.body.username,
            mobile: req.body.mobile,
            address: req.body.address,
            height: req.body.height,
            weight: req.body.weight,
            profile_mes: req.body.proMesEdit,
            description: req.body.description,
            image: `/img/profile_img/${req.file.filename}`
        } 
    }
    console.log(`\n${profileID} Edited Profile ↓ - ${date.toString()}`)
    console.log(profile_info_all)
    
    if (profile_info_all.email.length * profile_info_all.username.length == 0 ) {
        res.send(     
            `<script type='text/javascript'>alert('email and username must be required'); location.href='/profile/edit/${profileID}';</script>`,
         );
    
    } else{
        db.query(insert_query, profile_info_all, function(err, result){
            if(err) throw err;
        })
        res.send(     
            `<script type='text/javascript'>alert('Edited successfully!'); location.href='/profile/${profileID}';</script>`,
         );
    }
}

const getWorkout = (req, res) => {

    workoutID = req.params.id
    var getWorkout_query = "SELECT * FROM user_info WHERE id= ?"

    db.query(getWorkout_query, workoutID, (err, result) => {
        const acc_token = req.cookies.accessToken;
        const ref_token = req.cookies.refreshToken;
        if (result[0]===undefined) {
            res.send(     
                `<script type='text/javascript'>alert('Non-exists user'); location.href='/';</script>`,
             );
        }
        else {
            if (result[0].id == workoutID) {      
                jwt.verify(acc_token, "process.env.ACCESS_SECRET", (jwterr, jwtresult) => {
                    if (jwterr && jwtresult == undefined) {
                        jwt.verify(ref_token, "process.env.REFRESH_SECRET", (jwterr, jwtresult) => {
                            if (jwterr && jwtresult == undefined) {
                                res.send(     
                                    `<script type='text/javascript'>alert('Login Required'); location.href='/';</script>`,
                                 );
                            }
                            else{     
                                let new_acc_info = jwt.verify(ref_token, "process.env.REFRESH_SECRET") 
                                const accessToken = jwt.sign({
                                    id: new_acc_info['id'],
                                    username: new_acc_info['username'],
                                    email: new_acc_info['email'],
                                    image: new_acc_info['image'],
                                }, "process.env.ACCESS_SECRET", {
                                    expiresIn : '5s',
                                    issuer: 'Meer'
                                })
                                
                                res.cookie("accessToken", accessToken, {
                                    secure : false,
                                    httpOnly : true
                                })

                                console.log(`\nAccessToken issued to [${new_acc_info['id']}] at Workout - ${date.toString()}\n`)

                                let whoisown = jwt.verify(ref_token, "process.env.REFRESH_SECRET") 
                                if (workoutID == whoisown['id']) {                                                          
                                    res.render('workout', {logined: "y", 
                                                        id: result[0].id,
                                                        myid: result[0].id,
                                                        smallimage: result[0].image})
                                }
                                else {
                                    console.log(`${whoisown['id']}님이 ${workoutID}님의 운동 염탐중... - ${date.toString()}`)
                                    res.render('workout', {logined: "y", 
                                                        id: result[0].id,
                                                        myid: result[0].id,
                                                        smallimage: result[0].image})
                                }
                            }
                        })
                    }
                    else{
                        let new_acc_info = jwt.verify(ref_token, "process.env.REFRESH_SECRET") 
                        if (workoutID == new_acc_info['id']) { 
                            res.render('workout', {logined: "y", 
                                                        id: result[0].id,
                                                        myid: result[0].id,
                                                        smallimage: result[0].image})
                        }
                        else {
                            console.log(`\nAccessToken issued to [${new_acc_info['id']}] - ${date.toString()}\n`)
                            console.log(`\n${new_acc_info['id']}님이 ${workoutID}님의 운동 염탐중... - ${date.toString()}\n`)
                            res.render('workout', {logined: "y", 
                                                        id: result[0].id,
                                                        myid: result[0].id,
                                                        smallimage: result[0].image})
                        }
                    }
                    
                })
            }
            
        }
    })

}

module.exports = {
    connectToDb,
    verifyToken,
    contact,
    signup,
    login,
    getProfile,
    getProfileEdit,
    postProfileEdit,
    storage,
    upload,
    getWorkout,
};
