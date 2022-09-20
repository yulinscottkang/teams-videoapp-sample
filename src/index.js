import { app, video } from "@microsoft/teams-js";

import { WebglVideoFilter } from "./webgl-video-filter";

import { gaussBlur_4 } from "./gaussian";

import { WebglVideoFilters } from "./webgl-video-filters"

import { WebglFaceDetector } from "./webgl-face-detector"

import { bilateralFilterFast } from "./bilateral";
import cv from "@techstark/opencv-js";





app.initialize().then(() => {
console.log(Object.keys(cv).filter((key) => !key.includes("dynCall")));


let effectIds = {
  original: "e734baaf-c0a4-43aa-ba4b-b91daeaa8687",
  half: "8c54a395-5cad-443f-978a-12cb7d4d2e8d",
  gray: "e1039af5-5f80-4b59-8969-e91eb6c3b97c",
  bright: "51fbe862-08ff-488c-8c48-9ba30f1e43a3",
  cooler: "8a03f954-9ae7-4453-9376-6d7e1c7de0b8",
  red: "f334896f-e13f-4d73-807e-db3652fedf1e",
  green: "845dc834-b51b-4a26-ad5b-bc844cde41fa",
  blue: "143ee242-27ae-4f00-b3b6-83266d8800e2",
  gaussian: "bb667ed8-3bf9-4b1b-ad03-47b8f1f3f33c",
  glBoxBlur: "9a9a70ca-fa5b-498d-8ea0-514c4e7dd130",
  glGaussianBlur: "ec13973c-e866-4370-a6b5-615b67584b7f",
  glSharpen: "1f6fa287-2198-4314-9650-fe85c29ebfc1",
  glUnsharpen: "9cf9b5b7-33bc-48bb-9e93-6488cb8ce0a8",
  glEdgeDetection: "9dee20ec-ffde-47f4-82b7-9fa47fffe89d",
  glEmboss: "b3c47cb9-2223-4bf5-9674-fcd19e21b2e9",
  glFace: "9b8714c3-3a0c-4540-8900-329ca87933c2",
  glMask: "97d4f47a-75cb-47a5-af54-603f54ed640a",
  spring: "83d3f270-9c12-4ea3-be76-bc971894a8b0",
  summer: "2fc4f11f-c2f1-4149-9200-47f93770dc96",
  fall: "34081e61-e99d-4a40-8bc5-30ebe47430fd",
  winter: "f6fc39b0-8bbb-4890-a9bc-2066b350610d"
};

var cvMatSrc = null;
var cvMatDst = null;
var cvMatWidth = 0, cvMatHeight = 0;

function fixRange(min, max, curr)
{
  return Math.max(min, Math.min(max, curr));
}

function initCvMatIfNeed(frame)
{
  if (cvMatSrc == null || cvMatWidth != frame.width || cvMatHeight != frame.height)
  {
    cvMatSrc = new cv.Mat(frame.height, frame.width, cv.CV_8UC3);
    cvMatDst = new cv.Mat(frame.height, frame.width, cv.CV_8UC3);
    cvMatWidth = frame.width;
    cvMatHeight = frame.height;
  }
}

function convertFrameToRgb(frame)
{
  let size = frame.width * frame.height;
  let rgb = new Uint8Array(size * 3);
  for (let height = 0; height < frame.height; ++height)
  {
    for (let width = 0; width < frame.width; ++width)
    {
      const uvIndex = size + (height >> 1) * frame.chromaStride + (width & ~1);
      const y = frame.data[height * frame.lumaStride + width];
      const u = frame.data[uvIndex] - 128;
      const v = frame.data[uvIndex + 1] - 128;
      const r = fixRange(0, 255, y + 1.4*v - 0.7);
      const g = fixRange(0, 255, y - 0.343*u - 0.711*v + 0.526);
      const b = fixRange(0, 255, y + 1.765*u - 0.883);

      const rgbIndex = (height * frame.width + width) * 3;
      rgb[rgbIndex] = r;
      rgb[rgbIndex+1] = g;
      rgb[rgbIndex+2] = b;
    }
  }
  return rgb;
}

function convertFrameToRgb3(frame)
{
  let size = frame.width * frame.height;
  let rOut = new Uint8Array(size);
  let gOut = new Uint8Array(size);
  let bOut = new Uint8Array(size);
  for (let height = 0; height < frame.height; ++height)
  {
    for (let width = 0; width < frame.width; ++width)
    {
      const uvIndex = size + (height >> 1) * frame.chromaStride + (width & ~1);
      const y = frame.data[height * frame.lumaStride + width];
      const u = frame.data[uvIndex] - 128;
      const v = frame.data[uvIndex + 1] - 128;
      const r = fixRange(0, 255, y + 1.4*v - 0.7);
      const g = fixRange(0, 255, y - 0.343*u - 0.711*v + 0.526);
      const b = fixRange(0, 255, y + 1.765*u - 0.883);

      const rgbIndex = (height * frame.width + width);
      rOut[rgbIndex] = r;
      gOut[rgbIndex] = g;
      bOut[rgbIndex] = b;
    }
  }
  return [rOut, gOut, bOut];
}

function convertFrameToCvMat(frame, cvMat)
{
  let yuv = cv.matFromArray(Math.round(frame.height*1.5), frame.width , cv.CV_8UC1, frame.data);
  cv.cvtColor(yuv, cvMat, cv.COLOR_YUV2BGR_NV12);
  //let size = frame.width * frame.height;
  //for (let height = 0; height < frame.height; ++height)
  //{
  //  for (let width = 0; width < frame.width; ++width)
  //  {
  //    const uvIndex = size + (height >> 1) * frame.chromaStride + (width & ~1);
  //    const y = frame.data[height * frame.lumaStride + width];
  //    const u = frame.data[uvIndex] - 128;
  //    const v = frame.data[uvIndex + 1] - 128;
  //    const r = fixRange(0, 255, y + 1.4*v - 0.7);
  //    const g = fixRange(0, 255, y - 0.343*u - 0.711*v + 0.526);
  //    const b = fixRange(0, 255, y + 1.765*u - 0.883);
  //
  //    const rgbIndex = (height * frame.width + width) * 3;
  //    mat.data[rgbIndex] = b;
  //    mat.data[rgbIndex+1] = g;
  //    mat.data[rgbIndex+2] = r;
  //  }
  //}
}

function convertRgbToFrame(rgb, frame)
{
  let size = frame.width * frame.height;
  for (let height = 0; height < frame.height; ++height)
  {
    for (let width = 0; width < frame.width; ++width)
    {
      const rgbIndex = (height * frame.width + width) * 3;
      const r = rgb[rgbIndex];
      const g = rgb[rgbIndex + 1];
      const b = rgb[rgbIndex + 2];
      const y = fixRange(0, 255, 0.299*r + 0.587*g + 0.114*b);
      const u = fixRange(0, 255, -0.169*r - 0.331*g + 0.5*b + 128);
      const v = fixRange(0, 255, 0.5*r - 0.439*g - 0.081*b + 128);

      const uvIndex = size + (height >> 1) * frame.chromaStride + (width & ~1);
      frame.data[height * frame.lumaStride + width] = y;
      frame.data[uvIndex] = u;
      frame.data[uvIndex + 1] = v;
    }
  }
}

function convertRgb3ToFrame(rAry, gAry, bAry, frame)
{
  let size = frame.width * frame.height;
  for (let height = 0; height < frame.height; ++height)
  {
    for (let width = 0; width < frame.width; ++width)
    {
      const rgbIndex = (height * frame.width + width);
      const r = rAry[rgbIndex];
      const g = gAry[rgbIndex];
      const b = bAry[rgbIndex];
      const y = fixRange(0, 255, 0.299*r + 0.587*g + 0.114*b);
      const u = fixRange(0, 255, -0.169*r - 0.331*g + 0.5*b + 128);
      const v = fixRange(0, 255, 0.5*r - 0.439*g - 0.081*b + 128);

      const uvIndex = size + (height >> 1) * frame.chromaStride + (width & ~1);
      frame.data[height * frame.lumaStride + width] = y;
      frame.data[uvIndex] = u;
      frame.data[uvIndex + 1] = v;
    }
  }
}

function convertCvMatToFrame(mat, frame)
{
  let size = frame.width * frame.height;
  for (let height = 0; height < frame.height; ++height)
  {
    for (let width = 0; width < frame.width; ++width)
    {
      const rgbIndex = (height * frame.width + width) * 3;
      const b = mat.data[rgbIndex];
      const g = mat.data[rgbIndex + 1];
      const r = mat.data[rgbIndex + 2];
      const y = fixRange(0, 255, 0.299*r + 0.587*g + 0.114*b);
      const u = fixRange(0, 255, -0.169*r - 0.331*g + 0.5*b + 128);
      const v = fixRange(0, 255, 0.5*r - 0.439*g - 0.081*b + 128);

      const uvIndex = size + (height >> 1) * frame.chromaStride + (width & ~1);
      frame.data[height * frame.lumaStride + width] = y;
      frame.data[uvIndex] = u;
      frame.data[uvIndex + 1] = v;
    }
  }
}

function changeY(videoFrame, yIncrease) {
  const lenY = (videoFrame.height * videoFrame.width);

  for (let i = 0; i < lenY; ++i) {
    videoFrame.data[i] += yIncrease;
    videoFrame.data[i] = fixRange(0, 255, videoFrame.data[i]);
  }
}

function changeUV(videoFrame, uIncrease, vIncrease) {
  const offsetUV = (videoFrame.height * videoFrame.width);
  const imgEnd = Math.round(offsetUV * 1.5);

  for (let i = offsetUV; i < imgEnd; i += 2) {
    videoFrame.data[i] += uIncrease;
    videoFrame.data[i+1] += vIncrease;
    videoFrame.data[i] = fixRange(0, 255, videoFrame.data[i]);
    videoFrame.data[i+1] = fixRange(0, 255, videoFrame.data[i+1]);
  }
}

let canvas = new OffscreenCanvas(480,360);
let videoFilter = new WebglVideoFilter(canvas);
videoFilter.init();

const glBoxBlurFilter = new WebglVideoFilters("box-blur");
const glGaussianBlurFilter = new WebglVideoFilters("gaussian-blur");
const glSharpenFilter = new WebglVideoFilters("sharpen");
const glUnsharpenFilter = new WebglVideoFilters("unsharpen");
const glEdgeDetectionFilter = new WebglVideoFilters("edge-detection");
const glEmbossFilter = new WebglVideoFilters("emboss");
const faceDetector = new WebglFaceDetector();
faceDetector.init();

let selectedEffectId = undefined;

//Sample video effect
function videoFrameHandler(frame, notifyVideoProcessed, notifyError) {
  //console.log(frame);
  let rgb = null;
  switch (selectedEffectId) {
    case effectIds.original:
      break;
    case effectIds.half:
      break;
    case effectIds.gray:
      videoFilter.processVideoFrame(frame);
      break;
    case effectIds.bright:
      changeY(frame, 20);
      break;
    case effectIds.cooler:
      changeUV(frame, 5, -5);
      break;
    case effectIds.red:
      rgb = convertFrameToRgb(frame);
      for (let i = 0; i < rgb.length; i+=3)
      {
        rgb[i] = fixRange(0, 255, rgb[i] + 50);
      }
      convertRgbToFrame(rgb, frame);
      break;
    case effectIds.green:
      rgb = convertFrameToRgb(frame);
      for (let i = 0; i < rgb.length; i+=3)
      {
        rgb[i+1] = fixRange(0, 255, rgb[i+1] + 50);
      }
      convertRgbToFrame(rgb, frame);
      break;
    case effectIds.blue:
      rgb = convertFrameToRgb(frame);
      for (let i = 0; i < rgb.length; i+=3)
      {
        rgb[i+2] = fixRange(0, 255, rgb[i+2] + 50);
      }
      convertRgbToFrame(rgb, frame);
      break;
    case effectIds.gaussian:
      const [r, g, b] = convertFrameToRgb3(frame);
      let rOut = new Uint8Array(r.length);
      let gOut = new Uint8Array(g.length);
      let bOut = new Uint8Array(b.length);
      gaussBlur_4(r, rOut, frame.width, frame.height, 5);
      gaussBlur_4(g, gOut, frame.width, frame.height, 5);
      gaussBlur_4(b, bOut, frame.width, frame.height, 5);
      convertRgb3ToFrame(rOut, gOut, bOut, frame);
      break;
    case effectIds.glBoxBlur:
      glBoxBlurFilter.processVideoFrame(frame);
      break;
    case effectIds.glGaussianBlur:
      glGaussianBlurFilter.processVideoFrame(frame);
      break;
    case effectIds.glSharpen:
      glSharpenFilter.processVideoFrame(frame);
      break;
    case effectIds.glUnsharpen:
      glUnsharpenFilter.processVideoFrame(frame);
      break;
    case effectIds.glEdgeDetection:
      glEdgeDetectionFilter.processVideoFrame(frame);
      break;
    case effectIds.glEmboss:
      glEmbossFilter.processVideoFrame(frame);
      break;
    case effectIds.glFace:
      faceDetector.processVideoFrame(frame);
      break;
    case effectIds.glMask:
      faceDetector.processVideoFrame(frame, "/img/comedy-glasses.png");
      break;
    case effectIds.spring:
      initCvMatIfNeed(frame);
      changeY(frame, 20);
      convertFrameToCvMat(frame, cvMatSrc);
      //let dstSpring = cv.fastNlMeansDenoisingColored(srcSpring,null,10,10,7,21)
      cv.GaussianBlur(cvMatSrc, cvMatDst, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);
      convertCvMatToFrame(cvMatDst, frame);
      break;
    case effectIds.summer:
      changeY(frame, 20);
      const [rSummer, gSummer, bSummer] = convertFrameToRgb3(frame);
      let rSummerOut = new Uint8Array(rSummer.length);
      let gSummerOut = new Uint8Array(gSummer.length);
      let bSummerOut = new Uint8Array(bSummer.length);
      gaussBlur_4(rSummer, rSummerOut, frame.width, frame.height, 1);
      gaussBlur_4(gSummer, gSummerOut, frame.width, frame.height, 1);
      gaussBlur_4(bSummer, bSummerOut, frame.width, frame.height, 1);
      convertRgb3ToFrame(rSummerOut, gSummerOut, bSummerOut, frame);
      break;
    case effectIds.fall:
      initCvMatIfNeed(frame);
      changeY(frame, 20);
      convertFrameToCvMat(frame, cvMatSrc);
      cv.bilateralFilter(cvMatSrc, cvMatDst, 9, 75, 75, cv.BORDER_DEFAULT);
      convertCvMatToFrame(cvMatDst, frame);
      break;
    case effectIds.winter:
      const rgbWinter = convertFrameToRgb(frame);
      let bilateralFast = new bilateralFilterFast(32);
      let rgbWinterOut = bilateralFast.run(rgbWinter, frame.width, frame.height);
      convertRgbToFrame(rgbWinterOut, frame);
      break;
    default:
      break;
  }

  //send notification the effect processing is finshed.
  notifyVideoProcessed();

  //send error to Teams if any
  // if (errorOccurs) {
  //   notifyError("some error message");
  // }
}

function clearSelect() {
  document.querySelectorAll(".filter").forEach(elm => elm.classList.remove("selected"));
}

function effectParameterChanged(effectId) {
  console.log(effectId);
  if (selectedEffectId === effectId) {
    console.log('effect not changed');
    return;
  }
  selectedEffectId = effectId;

  clearSelect();
  for (let effectName in effectIds)
  {
    if (effectIds[effectName] != selectedEffectId)
    {
      continue;
    }
    console.log(`current effect: ${effectName}`);
    document.getElementById(`filter-${effectName}`).classList.add("selected");
  }
}

video.registerForVideoEffect(effectParameterChanged);
video.registerForVideoFrame(videoFrameHandler, {
  format: "NV12",
});

// any changes to the UI should notify Teams client.
for (let effectName in effectIds)
{
  const filter = document.getElementById(`filter-${effectName}`);
  filter.addEventListener("click", function () {
    if (selectedEffectId === effectIds[effectName])
    {
      return;
    }
    video.notifySelectedVideoEffectChanged("EffectChanged", effectIds[effectName]);
  });
}

});
