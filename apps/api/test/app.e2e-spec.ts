import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/configure-app';

describe('Foundation HTTP (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/health reports liveness', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok', service: 'api' });
  });

  it('GET /api/docs-json publishes the OpenAPI document outside production', async () => {
    await request(app.getHttpServer())
      .get('/api/docs')
      .redirects(1)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    expect(response.body).toMatchObject({
      info: { title: 'Guildcore API', version: '1.0' },
    });
    expect(response.body.paths['/api/v1/health']).toBeDefined();
  });
});
