import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';

const printable = (img?: Record<string, any>): string => {
  if (!img) return '';
  
  const id = img.id;
  const sk = img.sk;

  if (typeof id !== 'string' || typeof sk !== 'string') return JSON.stringify(img);

  const prefix = id[0];

  if (prefix === 'm') {
    // Movie: m{movieId} | xxxx | title | releaseDate | overview
    return `${id} | ${sk} | ${img.title ?? ''} | ${img.releaseDate ?? ''} | ${img.overview ?? ''}`;
  }
  if (prefix === 'c') {
    // Cast: c{movieId} | {actorId} | roleName | roleDescription
    return `${id} | ${sk} | ${img.roleName ?? ''} | ${img.roleDescription ?? ''}`;
  }
  if (prefix === 'w') {
    // Award: w{entityId} | body | category | year
    return `${id} | ${img.body ?? ''} | ${img.category ?? ''} | ${img.year ?? ''}`;
  }
  if (prefix === 'a') {
    // Actor (if ever used): a{actorId} | xxxx | name | bio | dob
    return `${id} | ${sk} | ${img.name ?? ''} | ${img.bio ?? ''} | ${img.dob ?? ''}`;
  }
  return JSON.stringify(img);
};

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const rec of event.Records) {
    logRecord(rec);
  }
};

const logRecord = (rec: DynamoDBRecord) => {
  try {
    if (rec.eventName === 'INSERT' && rec.dynamodb?.NewImage) {
      // POST + <printable>
      console.log(`POST + ${printable(unwrap(rec.dynamodb.NewImage))}`);
    }
    if (rec.eventName === 'REMOVE' && rec.dynamodb?.OldImage) {
      // DELETE <printable>
      console.log(`DELETE ${printable(unwrap(rec.dynamodb.OldImage))}`);
    }
  } catch (e: any) {
    console.log(JSON.stringify({ level: 'error', msg: 'state-change-logger failure', error: e?.message }));
  }
};

// Unwrap DynamoDB AttributeValue map (for Streams payload v1). If payload v2 is enabled, this is effectively a no-op.
const unwrap = (image: any): Record<string, any> => {
  // try to detect if already plain
  if (image && typeof image === 'object' && !('S' in image) && !('N' in image)) return image;
  const out: any = {};
  for (const k of Object.keys(image || {})) {
    const v = image[k];
    out[k] = fromAttr(v);
  }
  return out;
};

const fromAttr = (av: any): any => {
  if (av == null) return null;
  if ('S' in av) return av.S;
  if ('N' in av) return Number(av.N);
  if ('BOOL' in av) return av.BOOL;
  if ('L' in av) return (av.L || []).map(fromAttr);
  if ('M' in av) {
    const o: any = {};
    for (const k of Object.keys(av.M || {})) o[k] = fromAttr(av.M[k]);
    return o;
  }
  return av; 
};
