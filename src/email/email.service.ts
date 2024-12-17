import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as devConfig from '../../dev.json';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.naver.com',
      port: 587,
      secure: false,
      auth: {
        user: devConfig.NAVER_EMAIL,
        pass: devConfig.NAVER_PASSWORD,
      },
    });
  }

  async sendLetterNotification(to: string, letterTitle: string) {
    try {
      await this.transporter.sendMail({
        from: devConfig.NAVER_EMAIL,
        to,
        subject: '🎉 새로운 편지가 도착했습니다!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4A90E2;">새로운 편지가 도착했습니다! 📬</h1>
            <p style="font-size: 16px; color: #333;">
              안녕하세요! 새로운 편지가 도착했습니다.<br>
              지금 바로 확인해보세요!
            </p>
            <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
              <p style="margin: 0; color: #666;">
                편지 제목: <strong>${letterTitle}</strong>
              </p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://reindeer-letter.site" 
                 style="background-color: #4A90E2; 
                        color: white; 
                        padding: 12px 24px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        font-weight: bold;">
                편지 확인하러 가기
              </a>
            </div>
            <p style="font-size: 14px; color: #666;">
              * 이 메일은 자동으로 발송되었습니다.
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error('이메일 발송 실패:', error);
      throw error;
    }
  }

  async sendVerificationEmail(to: string, code: string) {
    await this.transporter.sendMail({
      from: devConfig.NAVER_EMAIL,
      to,
      subject: '🎄 Reindeer Letter 이메일 인증',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4A90E2;">이메일 인증</h1>
          <p style="font-size: 16px; color: #333;">
            안녕하세요! Reindeer Letter 회원가입을 위한 인증 코드입니다.<br>
            아래 코드를 입력해주세요.
          </p>
          <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px; text-align: center;">
            <h2 style="margin: 0; color: #333; letter-spacing: 5px;">${code}</h2>
          </div>
          <p style="font-size: 14px; color: #666;">
            * 이 코드는 10분 동안 유효합니다.
          </p>
        </div>
      `,
    });
  }
}
