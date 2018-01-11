# Passport
Passport 모듈을 통한 사용자 인증(Authentication)

### 모듈 import

세션 값은 서버 메모리에 저장해 두기 때문에 다시 실행하면 데이터가 모루 사라진다. 따라서 서버 데이터베이스에 따로 저장해야 한다.

- express
    ```javaScript
    var express = require('express');
    var bodyParser = require('body-parser');
    var session = require('express-session');
    var app = express();
    ```
- 세션 데이터베이스 모듈
    ```javaScript
    var FileStore = require('session-file-store')(session);
    ```
- 암호화 모듈
    ```javaScript
    var md5 = require('md5');
    var sha256 = require('sha256');
    var bkfd2Password = require('pbkdf2-password');
    var hasher = bkfd2Password();
    ```
- 인증 모듈 Passport
    ```javaScript
    var passport = require('passport')
    var LocalStrategy = require('passport-local').Strategy;
    ```


### 쿠키 미들웨어 등록

```javaScript 
app.use(session({
    key: '*****',
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
```

### WorkFlow

- 임시 DB Object

    ```javaScript
    var users = [
        {
            username : 'qskeksq',
            password : 'TbW6gj2gGj6SDZ7sdF55nSjV28qTyJV1ItlGJgmPHqRwy16tb9rXGSRsar8XWTRkWf1kE9UwZ6ueCfWtFWYWssq'
                        +'nReKNq/1iec2gA8S7k4fOybADzNbLGcRp1s8CIfGYDSJ8s/RNrhBeYa3/OiGgG0XOq4dVqLpMoQO9Y54xBT4=',
            salt = "qpcgXYJUcGRFH/3wIpQb85ztCwB/7NxrZVbkc8lg2lBvuLJRoXbow5lYi5KSVjQdqZ+N1PMkoYOkikwfHSp+Eg==",
        
            displayname : 'nadan'
        }
    ]
    ```

- 인증 등록(Passport)
    - 전략 선택
        - LocalStrategy
            ```javaScript
            passport.use(new LocalStrategy(
                // 아래 'local'을 통해 LocalStrategy 전략을 사용할 것을 명시한다
                function(username, password, done) {
                    var uname = username;
                    var pwd = password;
                    for(var i=0; i<users.length; i++){
                        var user = users[i];
                        if(user.username === username){
                            return hasher({password:pwd, salt:user.salt}, function(err, pass, salt, hash){
                                if(hash === user.password){
                                    console.log('LocalStrategy', user);                        
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
            ```
        - Facebook 타사인증
            ```javaScript
            passport.use(new FacebookStrategy({
                clientID: *****,
                clientSecret: '*****',
                callbackURL: "/auth/facebook/callback",
                // 추가정보를 원할 때 등록할 정보
                profileFields:['id', 'email', 'gender', 'link', 'locale', 'name', 'timezone', 'updated_time', 'verified', 'displayname']
            },
            // FacebookStrategy사용할 때 넘어오는 데이터들. 여기서 profile이 가장 중요하다
            function(accessToken, refreshToken, profile, done) {
                    console.log(profile);
                    // 넘어오는 값이 인증방법마다 다를 것인데, 공통속성이 id, displayname 일 것이다
                    // 따라서 local 전략에서 사용하는 DB도 이에 맞게 재구성한다.
                    var authId = 'facebook:'+profile.id;
                    for(var i=0; i<users.length; i++){
                        // 이미 등록된 사용자일 경우
                        if(user.authId === authId){
                        return done(null, user);
                        }
                    }
                    // 사용자가 한명도 없을 경우 새로 user생성해서
                    // 데이터베이스에 저장, 완료됨을 알려준다(done 호출)
                    var newuser = {
                        'authId':authId,
                        'displayname':profile.displayname,
                        'email':profile.emails[0].value
                    }
                    user.push(newuser);
                    done(null, newuser);
                }
            ));
            ```

    - serializeUser
        - done(null, user)의 두번째 인자가 false가 아닐 경우 user가 아래 user로 전달됨
        ```javaScript
        passport.serializeUser(function(user, done) {
            console.log('serializeUser', user);
            // 세션에 아이디가 등록됨
            done(null, user.username);
        });
        ```

    - deserializeUser
        - 처음 등록할 때는 serializeUser로 가고 그 다음부터는 deserializeUser 호출
        ```javaScript
        passport.deserializeUser(function(id, done) {
            console.log('deserializeUser', id);
            for(var i=0; i<users.length; i++){
                var user = users[i];
                if(user.username === id){
                    return done(null, user);
                }
            }
        });
        ```


- 로그인

    ```javaScript
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
    ```
    - 어떤 전략을 사용했는지 위에서 등록을 해 두면 전략에 의해 인증한 후 지정해 둔 페이지로 넘어간다
        - LocalStrategy
            ```javaScript
            app.post('/auth/login', passport.authenticate(
                    'local', 
                    {   successRedirect: '/welcom', // 성공할 경우
                        failureRedirect: '/auth/login', // 실패할 경우 다시 로그인
                        failureFlash: false // 인증에 실패했을경우 사용자에게 알려줌
                    }
                )
            );
            ```
        - FacebookStrategy
            ```javaScript
            app.get('/auth/facebook', passport.authenticate(
                    'facebook',
                    // 추가 정보를 원할 때는 따로 권한을 받아야 한다
                    // 어떤 정보를 받아올 수 있는지는 각 회사 developer페이지로 가보자
                    {scope: 'email'}
                    )
            );
            ```

- 

- 회원가입

    ```javaScript
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
    ```
    ```javaScript
    app.post('/auth/register', (req, res)=>{
        hasher({password:req.body.password}, function(err, pass, salt, hash){
            var user = {
                username : req.body.username,
                password : hash,
                salt : salt,
                displayname : req.body.displayname
            }
            users.push(user);
            // 바로 로그인하기 위해 로그인 이력을 미리 남겨둔다
            req.session.displayname = req.body.displayname;
            // 세션이 저장된 후 res할 수 있다
            req.session.save(function(){
                // 리턴으로 for문을 중지한다
                res.redirect('/welcome');
            });
        });
    });
    ```

- 회원페이지

    - 세션이 있으면 회원페이지 : 이전 페이지에서 세션을 확인하고 넘어왔는데 또 해주는 이유는 세션이 만료될 수 있고, 현재 페이지에서 계속 갱신이 일어날 수 있기 때문. 또한 추가로 세션을 확인하지 않는 다른 페이지에서도 넘어올 수 있다
    - 세션이 없으면 로그인 페이지로 넘어감

    ```javaScript
    app.get('/welcome', (req, res)=>{
        // 세션이 있으면 회원페이지
        if(req.session.displayname){
            res.send(
                `
                <h1>hello ${req.session.displayname} </h1>
                <a href="/auth/logout">logout</a>
                `)
        // 세션이 없으면 로그인 페이지로 넘어감
        } else {
            res.send(
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
    ```

- 로그아웃

    - 로그아웃 요청이 있을 경우 서버의 세션 삭제

    ```javaScript
    req.logout();
    res.redirect('/welcome');
    ```
