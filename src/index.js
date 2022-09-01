import { app, video } from "@microsoft/teams-js";

import { WebglVideoFilter } from "./webgl-video-filter";

app.initialize().then(() => {
// This is the effect for processing
let appliedEffect = {
  pixelValue: 100,
  proportion: 3,
  brightnessIncrease: 20,
  coolerUIncrease: 5,
  coolerVIncrease: -5,
};

let effectIds = {
  half: "8c54a395-5cad-443f-978a-12cb7d4d2e8d",
  gray: "e1039af5-5f80-4b59-8969-e91eb6c3b97c",
  bright: "51fbe862-08ff-488c-8c48-9ba30f1e43a3",
  cooler: "8a03f954-9ae7-4453-9376-6d7e1c7de0b8",
  red: "f334896f-e13f-4d73-807e-db3652fedf1e",
  green: "845dc834-b51b-4a26-ad5b-bc844cde41fa",
  blue: "143ee242-27ae-4f00-b3b6-83266d8800e2",
  gaussian: "bb667ed8-3bf9-4b1b-ad03-47b8f1f3f33c"
}

function fixRange(min, max, curr)
{
  return Math.max(min, Math.min(max, curr));
}

function convertToRgb(frame)
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

function convertToFrame(rgb, frame)
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

// This is the effect linked with UI
let uiSelectedEffect = {};
let selectedEffectId = undefined;
let errorOccurs = false;
let useSimpleEffect = false;
function simpleHalfEffect(videoFrame) {
  const maxLen =
    (videoFrame.height * videoFrame.width) /
      Math.max(1, appliedEffect.proportion) - 4;

  for (let i = 1; i < maxLen; i += 4) {
    //smaple effect just change the value to 100, which effect some pixel value of video frame
    videoFrame.data[i + 1] = appliedEffect.pixelValue;
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
//Sample video effect
function videoFrameHandler(videoFrame, notifyVideoProcessed, notifyError) {
  //console.log(videoFrame);
  let rgb = null;
  switch (selectedEffectId) {
    case effectIds.half:
      simpleHalfEffect(videoFrame);
      break;
    case effectIds.gray:
      videoFilter.processVideoFrame(videoFrame);
      break;
    case effectIds.bright:
      changeY(videoFrame, appliedEffect.brightnessIncrease);
      break;
    case effectIds.cooler:
      changeY(videoFrame, 20);
      changeUV(videoFrame, appliedEffect.coolerUIncrease, appliedEffect.coolerVIncrease);
      break;
    case effectIds.red:
      rgb = convertToRgb(videoFrame);
      for (let i = 0; i < rgb.length; i+=3)
      {
        rgb[i] = fixRange(0, 255, rgb[i] + 50);
      }
      convertToFrame(rgb, videoFrame);
      break;
    case effectIds.green:
      rgb = convertToRgb(videoFrame);
      for (let i = 0; i < rgb.length; i+=3)
      {
        rgb[i+1] = fixRange(0, 255, rgb[i+1] + 50);
      }
      convertToFrame(rgb, videoFrame);
      break;
    case effectIds.blue:
      rgb = convertToRgb(videoFrame);
      for (let i = 0; i < rgb.length; i+=3)
      {
        rgb[i+2] = fixRange(0, 255, rgb[i+2] + 50);
      }
      convertToFrame(rgb, videoFrame);
      break;
    case effectIds.gaussian:
      rgb = convertToRgb(videoFrame);
      convertToFrame(rgb, videoFrame);
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
  document.getElementById("filter-half").classList.remove("selected");
  document.getElementById("filter-gray").classList.remove("selected");
  document.getElementById("filter-bright").classList.remove("selected");
  document.getElementById("filter-cooler").classList.remove("selected");
  document.getElementById("filter-red").classList.remove("selected");
  document.getElementById("filter-green").classList.remove("selected");
  document.getElementById("filter-blue").classList.remove("selected");
  document.getElementById("filter-gaussian").classList.remove("selected");
}

function effectParameterChanged(effectId) {
  console.log(effectId);
  if (selectedEffectId === effectId) {
    console.log('effect not changed');
    return;
  }
  selectedEffectId = effectId;

  clearSelect();
  switch (selectedEffectId) {
    case effectIds.half:
      console.log('current effect: half');
      document.getElementById("filter-half").classList.add("selected");
      break;
    case effectIds.gray:
      console.log('current effect: gray');
      document.getElementById("filter-gray").classList.add("selected");
      break;
    case effectIds.bright:
      console.log('current effect: bright');
      document.getElementById("filter-bright").classList.add("selected");
      break;
    case effectIds.cooler:
      console.log('current effect: cooler');
      document.getElementById("filter-cooler").classList.add("selected");
      break;
    case effectIds.red:
      console.log('current effect: red');
      document.getElementById("filter-red").classList.add("selected");
      break;
    case effectIds.green:
      console.log('current effect: green');
      document.getElementById("filter-green").classList.add("selected");
      break;
    case effectIds.blue:
      console.log('current effect: blue');
      document.getElementById("filter-blue").classList.add("selected");
      break;
    case effectIds.gaussian:
      console.log('current effect: gaussian');
      document.getElementById("filter-gaussian").classList.add("selected");
      break;
    default:
      console.log('effect cleared');
      break;
  }
}

video.registerForVideoEffect(effectParameterChanged);
video.registerForVideoFrame(videoFrameHandler, {
  format: "NV12",
});

// any changes to the UI should notify Teams client.
const filterHalf = document.getElementById("filter-half");
filterHalf.addEventListener("click", function () {
  if (selectedEffectId === effectIds.half) {
    return;
  }
  video.notifySelectedVideoEffectChanged("EffectChanged", effectIds.half);
});
const filterGray = document.getElementById("filter-gray");
filterGray.addEventListener("click", function () {
  if (selectedEffectId === effectIds.gray) {
    return;
  }
  video.notifySelectedVideoEffectChanged("EffectChanged", effectIds.gray);
});
const filterBright = document.getElementById("filter-bright");
filterBright.addEventListener("click", function () {
  if (selectedEffectId === effectIds.bright) {
    return;
  }
  video.notifySelectedVideoEffectChanged("EffectChanged", effectIds.bright);
});
const filterCooler = document.getElementById("filter-cooler");
filterCooler.addEventListener("click", function () {
  if (selectedEffectId === effectIds.cooler) {
    return;
  }
  video.notifySelectedVideoEffectChanged("EffectChanged", effectIds.cooler);
});
const filterRed = document.getElementById("filter-red");
filterRed.addEventListener("click", function () {
  if (selectedEffectId === effectIds.red) {
    return;
  }
  video.notifySelectedVideoEffectChanged("EffectChanged", effectIds.red);
});
const filterGreen = document.getElementById("filter-green");
filterGreen.addEventListener("click", function () {
  if (selectedEffectId === effectIds.green) {
    return;
  }
  video.notifySelectedVideoEffectChanged("EffectChanged", effectIds.green);
});
const filterBlue = document.getElementById("filter-blue");
filterBlue.addEventListener("click", function () {
  if (selectedEffectId === effectIds.blue) {
    return;
  }
  video.notifySelectedVideoEffectChanged("EffectChanged", effectIds.blue);
});
const filterGaussian = document.getElementById("filter-gaussian");
filterGaussian.addEventListener("click", function () {
  if (selectedEffectId === effectIds.gaussian) {
    return;
  }
  video.notifySelectedVideoEffectChanged("EffectChanged", effectIds.gaussian);
});

});
