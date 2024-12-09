import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LettersService } from './letters/letters.service';

export const handler = async (event: any) => {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const lettersService = app.get(LettersService);

    const result = await lettersService.processScheduledLetters();

    await app.close();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Scheduled letters processed successfully',
        result,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing scheduled letters',
        error: (error as Error).message,
      }),
    };
  }
};
