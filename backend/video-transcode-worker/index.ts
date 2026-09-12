import { connectDatabase, db } from "@repo/database";

await connectDatabase(); 
async function dbcall(){
    return db.orm.public.User.where({id:1}).select("email").first()
}
const users =await dbcall()
console.log(users)