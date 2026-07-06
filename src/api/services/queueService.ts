export type Job = {
  id: string;
  name: string;
  data: any;
  opts?: any;
  progress: number;
  status: string;
  remove: () => Promise<void>;
  updateProgress: (value: number) => Promise<void>;
};

async function getRedisConfig(clientId?: string) {
  return null;
}

export class Queue {
  public name: string;
  private opts: any;
  private clientId?: string;

  constructor(name: string, opts?: any) {
    this.name = name;
    this.opts = opts;
    this.clientId = opts?.clientId;
  }

  async add(name: string, data: any, opts?: any) {
    console.log(`[Queue ${this.name}] add ignored`);
    return null;
  }

  async getJobs(types: string[]) {
    return [];
  }
}

export class Worker {
  public name: string;
  private processor: (job: Job) => Promise<any>;
  private opts: any;
  private clientId?: string;

  constructor(name: string, processor: (job: any) => Promise<any>, opts?: any) {
    this.name = name;
    this.processor = processor;
    this.opts = opts;
    this.clientId = opts?.clientId;
  }
}

export const queueService = {
  async init() {
    console.log('[QueueService] Initialized in REDIS-ONLY mode.');
  }
};
