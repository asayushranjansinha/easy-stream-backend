import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'

const app = express()


app.use(cors(
    {
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    }
))
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(cookieParser())

// routes import
import userRouter from './routes/user.routes'
import videoRouter from './routes/video.routes'
import likeRouter from './routes/like.routes'
import commentRouter from './routes/comment.routes'

app.get('/', (req, res) => {
    console.log("reached")
    res.send("OK")
})
// routes declaration
app.use('/api/v1/users', userRouter)
app.use('/api/v1/videos', videoRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/comments", commentRouter)

export { app }