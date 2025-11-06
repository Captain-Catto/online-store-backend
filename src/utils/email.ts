import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    //nếu như có lỗi thì mở cmt ra
    // ko hiểu vì sao có lúc lại không gửi mail được
    //host: "smtp.gmail.com",
    //port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  // Cấu hình email
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.GMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    // Gửi email
    await transporter.sendMail(mailOptions);
    console.log(`Email đã được gửi đến: ${options.to}`);
  } catch (error) {
    console.log(`Lỗi khi gửi email đến ${options.to}:`, error);
    throw error;
  }
};
