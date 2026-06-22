import nodemailer from "nodemailer"

async function main() {
  const account = await nodemailer.createTestAccount()
  console.log("ETHEREAL_USER=" + account.user)
  console.log("ETHEREAL_PASS=" + account.pass)
  console.log("View sent emails at: https://ethereal.email")
}

main().catch(console.error)
