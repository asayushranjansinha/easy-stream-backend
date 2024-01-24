import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'

const app = express()




// routes import
import userRouter from './routes/user.routes'
import videoRouter from './routes/video.routes'
import likeRouter from './routes/like.routes'
import commentRouter from './routes/comment.routes'
import tweetRouter from './routes/tweet.routes'
import subscriptionRouter from './routes/subscription.routes'
import playlistRouter from './routes/playlist.routes'
import { errorHandlerMiddleware } from './middlewares/error.middleware'


app.use(cors())
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(cookieParser())


app.get('/', (req, res) => {
    console.log("reached")
    return res.status(200).json({ success: "OK" })
})
// routes declaration
app.use('/api/v1/users', userRouter)
app.use('/api/v1/videos', videoRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/playlists/", playlistRouter)

app.use(errorHandlerMiddleware)

export { app }