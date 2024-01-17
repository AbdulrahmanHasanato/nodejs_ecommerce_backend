const nodemailer = require("nodemailer");

//Nodemailer
const sendEmail = async (options) => {
    //1- Create transporter (Service that will send the email)
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.PORT,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });
    //2- Define email options (from, to, subject, body)
    const mailOpts = {
        from: "E-shop App <progahmedelsayed@gmail.com>",
        to: options.email,
        subject: options.subject,
        text: options.message,
    };
    //3- Send email
    await transporter.sendMail(mailOpts);
};

module.exports = sendEmail;
