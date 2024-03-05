// require('dotenv').config({path:'./env'})

import dotenv from 'dotenv'

import express from "express"
import connectDB from "./db/index.js"

dotenv.config({
    path:'./env'
})

connectDB()


/*
const app = express();


(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGO_URI}`/`${DB_NAME}`)
        app.on("error",(error)=>{
            console.error("DB CONNECTION ERROR: ", error)
            throw error
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`App is listening on port ${process.env.PORT}`)
        })
    } catch (error) {
        console.error("DB CONNECTION ERROR:", error)
        throw error
    }
})()
*/