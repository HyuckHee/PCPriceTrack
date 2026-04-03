/**
 * 크론 스케줄은 CrawlerScheduleService가 동적으로 관리합니다.
 * (DB에 저장된 설정 기반으로 SchedulerRegistry를 통해 크론 등록)
 *
 * 이 파일은 호환성 유지를 위해 빈 클래스로 유지합니다.
 * 실제 스케줄 로직: services/crawler-schedule.service.ts
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class CrawlerScheduler {}
