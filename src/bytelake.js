import axios from "axios";
import FormData from 'form-data';
import { Readable } from "stream";

const CONTROLPLANE_BASE = "http://api.bytelake.slabs.pt";

export async function GetObject(objectUrn) {
  if (!objectUrn || typeof objectUrn !== "string") {
    throw new TypeError("GetObject(objectUrn): objectUrn must be a non-empty string");
  }

  try {
    const infoRes = await axios.get(`${CONTROLPLANE_BASE}/object/${objectUrn}`, {
      timeout: 1000*10
    });

    const objRes = await axios.get("http://" + infoRes.data.lakePath + ".lake.tryspacelabs.pt/" + infoRes.data.path + "?authorization=" + process.env.STS_CODE, {
      responseType: "stream",
      timeout: 1000*60*10,
    });

    return {
      data: objRes.data,
      name: infoRes.data.name,
      createdAt: infoRes.data.createdAt
    };
  } catch (err) {
    console.error(`GetObject(${objectUrn}) failed:`, err?.message || err);
    throw err;
  }
}

export async function PutObject(lakeName, data, fileName){
  if (!lakeName){
    throw new Error("PutObject: lakeName is required");
  }
  if (!fileName){
    throw new Error("PutObject: fileName is required");
  }
  if (!data){
    throw new Error("PutObject: data is required");
  }

  const form = new FormData();

  let body = data;
  if (data instanceof ArrayBuffer){
    body = Buffer.from(data);
  }

  if (data instanceof Uint8Array && !Buffer.isBuffer(data)){
    body = Buffer.from(data);
  }

  if (!(Buffer.isBuffer(body) || body instanceof Readable)) {
    throw new Error("PutObject: data must be Buffer/Uint8Array/ArrayBuffer/Readable stream");
  }

  form.append("file", body, fileName);

  const url = `${CONTROLPLANE_BASE}/fileUpload/${lakeName}`;

  const res = await axios.post(url, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${process.env.STS_CODE}`,
    }
  });

  return res.data;
}