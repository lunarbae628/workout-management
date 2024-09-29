const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const nodemailer = require('nodemailer')
const ejs = require('ejs')
const fs = require('fs')
const express = require('express');
const { json } = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({extended: true}));

var db = mysql.createConnection({
    host:'localhost',
    port:'3306',
    user: 'root',
    password: '0000',
    database: 'user_info'
});

db.connect(function(err){
    if (err) throw err;
    console.log("SQL Connected");
});


app.use(cookieParser());

app.listen(8000, function(){
    console.log('listening on 8080')
});

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


app.use(express.static(__dirname));

app.use(express.static('./'));

app.get('/', function(req, res){

    var verify_Info = "SELECT email,username FROM user_info WHERE id IN(?);"
    try {
        var accessToken = req.cookies.accessToken
        var refreshToken = req.cookies.refreshToken

        if (accessToken != undefined){
            console.log("맛있는 쿠키: "+accessToken)
            console.log("리휘레쉬 쿠키: "+ typeof(refreshToken))
            var data = jwt.verify(accessToken, "accesssecret");
            console.log("자! 검증드가자 상한 쿠키임? : "+ data['id'])
            db.query(verify_Info, data['id'], function(err, result){
                if(err) throw err;
                if(data['email'] == result[0].email){
                    res.render('index',{logined: 'y'})    
                    res.render('index', {username: data['username']})          
                }
            })
        // }else if (accessToken==undefined){
        //     var data = jwt.verify(refreshToken, "refreshsecret");
        //     db.query(verify_Info, data['id'], function(err, result){
        //         if(err) throw err;
        //         if(data['email']== result[0].email){
        //             const accessToken = jwt.sign({ 
        //                 id : data['id'],
        //                 username: result[0].username,
        //                 email: result[0].email,
                                
        //                 }, ACCESS_SECRET, {
        //                 expiresIn : '15s',
        //                 issuer : 'Meer'
        //             });
        //             res.cookie("accessToken", accessToken, {
        //                 secure : false,
        //                 httpOnly : true,
        //             })

        //             res.render('index',{logined: 'y'})    
        //             res.render('index', {username: data['username']})
        //         }
        //     })
        // }

        }else {
            res.render('index',{logined: 'n'});
            console.log("쿠키 없졍")
        }
    } catch (error) {
        
    }    

});


app.post('/', function(req, res){

    var contact_info = {
        Firstname : req.body.firstname + " " + req.body.lastname,
        Email: req.body.email,
        phone_num: req.body.phone,
        Message: req.body.message
    }   

    var json = JSON.stringify(contact_info)

    console.log("<<<New Contact Arrived>>>\n")
    console.log(contact_info)

    var jsonBuffer = fs.readFileSync('contactLog.txt')
    var past_json = jsonBuffer.toString();

    var update_json = past_json + "\n" + json

    if (past_json == "") {
        fs.writeFileSync('contactLog.txt', json)
        console.log("Save a Contact as txt")
    }
    else{
        fs.writeFileSync('contactLog.txt', update_json)
        console.log("Save a Contact as txt")
    }

    res.send(
        "<script type='text/javascript'>location.href='/';</script>"
    )

})
    

app.get('/login', function(req, res){
    res.render('login', {login_value: 3})
});


app.get('/logout', function(req,res){
    res.clearCookie('accessToken');
    res.redirect('/');
})

app.get('/signup', function(req, res){
    res.sendFile(__dirname + '/signup.html')
});


app.post('/signup', function(req, res){
    
    var insert_query = "INSERT INTO user_info SET ?";
    var info_all = {
        username: req.body.username,
        id: req.body.id,
        password: req.body.password,
        email: req.body.email

    }

    if (info_all.id.length * info_all.password.length * info_all.username == 0 ) {
        res.send(     
            "<script type='text/javascript'>alert('ID ,Password and Username must be required'); location.href='/signup';</script>",
         );
    
    } else{
        db.query(insert_query, info_all, function(err, result){
            if(err) throw err;
            console.log("\n---New Signup---");
            console.log(JSON.parse(JSON.stringify(info_all)));
            res.render('signupSuc', {username: info_all.username})
            
        })
    }
       
            
});
ACCESS_SECRET = "accesssecret"
REFRESH_SECRET = "refreshsecret"

app.post('/login', function(req, res){

    var id_login_query = "SELECT * FROM user_info WHERE id= ?"
    var find_otherInfo = "SELECT email,username FROM user_info WHERE id IN(?);"
    var id = req.body.id;
    var password = req.body.password;

    db.query(id_login_query, [id], function(err, result, fields){
        if(err) {
            console.log("Error")
            res.send({
                "code": 400,
                "failed": "error ocurred, plz try again"
            })


        } else{
            if(result.length > 0) {
                if(result[0].password == password) {
                    db.query(find_otherInfo, [id], function(err,result2){
                        
                        const accessToken = jwt.sign({
                            id : id,
                            username: result2[0].username,
                            email: result2[0].email,
                    
                        }, ACCESS_SECRET, {
                            expiresIn : '15s',
                            issuer : 'Meer'
                        });

                        const refreshToken = jwt.sign({
                            id : id,
                            username: result2[0].username,
                            email: result2[0].email,

                        }, REFRESH_SECRET, {
                            expiresIn : '24h',
                            issuer : "Meer"
                         });

                            // token 전송
                        res.cookie("accessToken", accessToken, {
                            secure : false,
                            httpOnly : true,
                        })

                        res.cookie("refreshToken", refreshToken, {
                            secure : false,
                            httpOnly : true,
                        })


                        res.redirect('/')
                        
                        })
                        
        
                } else {
                    res.render('login', {login_value: 1})

                }
            } else {
                res.render('login', {login_value: 2})
  
            }
        }
    })
})


app.get('/workout', function(req, res){ 
    try {
        var auth = req.cookies.accessToken
    } catch (error) {
        console.log("dfsfdsfsfdfsf")
    }

    if (auth) {  
        var data = jwt.verify(auth, "accesssecret");
        res.render('workout',{username: data['username']}) 
    }
    else {
        res.render('error', {err: "Login Required"})
    }
})

app.post('/profile', function(req, res){
    var token = req.cookies.accessToken
    if (token) {
        var data = jwt.verify(token, "accesssecret");
        res.render('profile', {username: data['username'], email: data['email']});
    }

})


// 다른 사람 프로필 보기 get요청 하면 url에 보임
// app.get('/profile', function(req, res){
//     var token = req.cookies.accessToken
//     if (token) {
//         var data = jwt.verify(token, "accesssecret");
//         res.render('profile', {username: data['username'], email: data['email']});
//     }

// })