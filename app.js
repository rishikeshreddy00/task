const express = require("express");
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")
const ejs = require("ejs")
const session = require("express-session")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate")
const dotenv = require("dotenv")


const app = express()

//load env vars 
dotenv.config({path: "./config/config.env"})

app.use(express.static("public"))
app.set("view engine","ejs")
//parse bodies from url
app.use(bodyParser.urlencoded({extended: true}))

//
app.use(session({
    secret: 'Internship Task',
    resave: false,
    saveUninitialized: false,
}))

//initialize passport
app.use(passport.initialize())
app.use(passport.session())


mongoose.connect('mongodb://localhost:27017/internshala', {useNewUrlParser: true,useUnifiedTopology: true});
mongoose.set("useCreateIndex",true)

const userSchema = new mongoose.Schema({
    username : String,
    password : String,
    googleId : String,
    address : String
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

const User = new mongoose.model("Intern",userSchema)

passport.use(User.createStrategy());
 
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
User.findById(id, function(err, user) {
    done(err, user);
});
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/user",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id ,username: profile.displayName}, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",(req,res)=>{
    res.render("home")
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/user', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect user.
    res.redirect('/user');
});

app.get("/login",(req,res)=>{
    res.render("signin")
})

app.get("/register",(req,res)=>{
    res.render("signup")
})

app.get("/user",function(req,res){
    if (req.isAuthenticated()){
        User.findById(req.user.id,function(err,foundUser){
            if(err){
                console.log(err)
            }else {
                console.log(foundUser.address)
                res.render("user",{user : foundUser})
            }
        })
    }else {
        res.redirect("/login")
    }
})

app.get("/add/address",(req,res)=>{
    if (req.isAuthenticated()){
        res.render("address")
    }else {
        res.redirect("/login")
    }
})

app.post("/add/address",(req,res)=>{
    const address = req.body.address

    console.log(req.user.id);
    User.findById(req.user.id,function(err,foundUser){
        if(err){
            console.log(err)
        }else {
            if (foundUser) {
                foundUser.address = address
                foundUser.save(()=>{
                    res.redirect("/user")
                })
            }
        }
    })
})
app.get("/logout",function(req,res){
    req.logout()
    res.redirect("/")
})

app.post("/register",(req,res)=>{
    User.register({username:req.body.username}, req.body.password, function(err, user) {
        if (err) {
            console.log(err)
            res.redirect("/register")
         }
        else {
            passport.authenticate("local")(req,res, function(){
                res.redirect("/user")
            })
        }
       
    });
})

app.post("/login",function(req,res){

    const user = new User({
        username: req.body.username,
        password: req.body.password
    })

    req.login(user, function(err){
        if (err){
            console.log(err)
        }else {
            passport.authenticate("local")(req,res, function(){
                res.redirect("/user")
            })
        }
    })
})

app.listen("3000",()=>{
    console.log("server started")
})
