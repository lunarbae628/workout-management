const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const multer = require('multer')
const path = require('path')

const {
    connectToDb,
    verifyToken,
    contact,
    signup,
    login,
    getProfile,
    getProfileEdit,
    postProfileEdit,
    storate,
    upload,
    getWorkout,
} = require('./controller.js')

app.use(express.static(__dirname))
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.use(
    cors({
        origin: "http://localhost:8000",
        methods: ["GET", "POST"],
        credentials: true,
    })
)

app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')

app.listen(8000, function(){
    console.log('listening on 8080')
});

connectToDb()


app.get('/', verifyToken)

app.post('/', contact)

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/signup.html')
});

app.post('/signup', signup)

app.get('/login', (req, res) => {
    res.render('login', {login_value: 3})
})
app.post('/login', login)

app.get('/logout', (req,res) => {
    const ref_token = req.cookies.refreshToken;
    const logout = jwt.verify(ref_token, "process.env.REFRESH_SECRET")
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.redirect('/');
    console.log(`\n${logout['id']} has been logouted\n`)
})

app.get('/profile/:id', getProfile)

app.get('/profile/edit/:id', getProfileEdit)

app.post('/profile/edit/:id', upload.single("image"), postProfileEdit)

app.get('/profile/err:id', (req, res) => {
    res.render('nonexisprofile')
})

app.get('/workout/:id', getWorkout)
