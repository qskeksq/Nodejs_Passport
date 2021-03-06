var express = require('express');
var bodyParser = require('body-parser');

// 세션 값을 메모리에 저장해 두기 때문에 다시 실행하면 데이터가 모루 사라진다. 따라서 데이터베이스에 따로 저장해야 한다
var session = require('express-session');
var FileStore = require('session-file-store')(session);
var md5 = require('md5');
var sha256 = require('sha256');
var bkfd2Password = require('pbkdf2-password');
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy;
var hasher = bkfd2Password();
var app = express();

// 미들웨어 설정
app.use(session({
    key: 'mykey',
    secret: 'a',
    resave: false,          // 세션을 발급할 때마다 새 값으로 할 것인지
    saveUninitialized: true,
    cookie: {
        maxAge: 24000 * 60 * 60,
        secure: false
    }
    // store: new FileStore()
}));
app.use(bodyParser.urlencoded({extended : false}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/login',(req, res)=>{
    var output = `
    <h1>Login</h1>
    <form action="/auth/login" method="POST">
        <p>
            <input type="text" name="username" placeholder="username">
        </p>
        <p>
            <input type="password" name="password" placeholder="password">
        </p>
        <p>
            <input type="submit">
        </p>
    </form>
    `
    res.send(output);
});

// done(null, user)의 두번째 인자가 false가 아닐 경우
// user가 아래 user로 전달됨
passport.serializeUser(function(user, done) {
    console.log('serializeUser', user);
    // 세션에 아이디가 등록됨
    done(null, user.username);
});
  
// 처음 등록할 때는 serializeUser로 가고 그 다음부터는 deserializeUser 호출
passport.deserializeUser(function(id, done) {
    console.log('deserializeUser', id);
    for(var i=0; i<users.length; i++){
        var user = users[i];
        if(user.username === id){
            return done(null, user);
        }
    }
});

// 기존 /auth/login 전략과 잘 비교해본다
// 로그인 전략을 세워줌-LocalStrategy
passport.use(new LocalStrategy(
    // 아래 'local'을 통해 LocalStrategy 전략을 사용할 것을 명시한다
    function(username, password, done) {
        var uname = username;
        var pwd = password;
        for(var i=0; i<users.length; i++){
            var user = users[i];
            if(user.username === username){
                // 해시화 과정을 통해서 입력된 값과 DB에 저장된 salt값의 조합의 암호화 값이, 
                // 비밀번호를 만들면서 조합한 암호화 값과 같은지 확인 
                return hasher({password:pwd, salt:user.salt}, function(err, pass, salt, hash){
                    // 값이 같으면
                    if(hash === user.password){
                        console.log('LocalStrategy', user);                        
                        // 첫번째 인자로 에러, 두번째 인자로 값, 세번째 인자로 메시지
                        done(null, user);
                    } else {
                        done(null, false);
                   }
                });
            }
        }
        done(null, false, { message: 'Incorrect username.' });
    }
));

app.post('/auth/login', passport.authenticate(
        'local', 
        {   successRedirect: '/welcom', // 성공할 경우
            failureRedirect: '/auth/login', // 실패할 경우 다시 로그인
            failureFlash: false // 인증에 실패했을경우 사용자에게 알려줌
        }
    )
);

// deserializeUser의 done(null, user)에서 넘겨준 user가 req에 담겨온다
app.get('/welcome', (req, res)=>{

    if(req.user && req.user.displayname){
        res.send(
            `
            <h1>hello ${req.user.displayname} </h1>
            <a href="/auth/logout">logout</a>
            `)
    } else {
        res.send(
            `
            <h1>Welcome</h1>
            <ul>
                <li><a href="/auth/login">login</a></li>
                <li><a href="/auth/register">Register</a></li>
            </ul>
            `)
    }
});

app.get('/auth/register', (req, res)=>{
    var output=
    `
    <h1>Register</h1>
    <form action="/auth/register" method="POST">
        <p>
            <input type="text" name="username" placeholder="username">
        </p>
        <p>
            <input type="password" name="password" placeholder="password">
        </p>
        <p>
            <input type="text" name="displayname" placeholder="displayname">
        </p>
        <p>
            <input type="submit">
        </p>
    </form>
    `
    res.send(output);
});

var users = [
    {
        username : 'qskeksq',
        password : 'TbW6gj2gGj6SDZ7sdF55nSjV28qTyJV1ItlGJgmPHqRwy16tb9rXGSRsar8XWTRkWf1kE9UwZ6ueCfWtFWYWssq'
                    +'nReKNq/1iec2gA8S7k4fOybADzNbLGcRp1s8CIfGYDSJ8s/RNrhBeYa3/OiGgG0XOq4dVqLpMoQO9Y54xBT4=',
        salt = "qpcgXYJUcGRFH/3wIpQb85ztCwB/7NxrZVbkc8lg2lBvuLJRoXbow5lYi5KSVjQdqZ+N1PMkoYOkikwfHSp+Eg==",
    
        displayname : 'nadan'
    }
]

app.post('/auth/register', (req, res)=>{
    hasher({password:req.body.password}, function(err, pass, salt, hash){
        var user = {
            username : req.body.username,
            password : hash,
            salt : salt,
            displayname : req.body.displayname
        }
    });
    

    /**
     * 기존 사용자 확인
     * 비밀번호 확인
     * 비밀번호 이중 체크
     */
    users.push(user);

    req.login(user, function(err){
        req.session.save(function(){
            res.redirect('/welcome');
        })
    });
});

app.get('/auth/logout', (req, res)=>{
    req.logout();
    req.session.save(function(){
        res.redirect('/welcome');        
    });
});

app.listen(3000, function(){
    console.log('server is running');
});