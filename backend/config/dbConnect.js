const mongoose = require('mongoose');

const connectdb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {useNewUrlParser:true,
         useUnifiedTopology:true
        }); //what ?
        console.log("mongodb connected successfully!")
    } catch (error) {
        console.error('connecting to db failed', error.message)
        process.exit(1);
    }
}

module.exports = connectdb;