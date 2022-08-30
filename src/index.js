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
}

function fixRange(min, max, curr)
{
  return Math.max(min, Math.min(max, curr));
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

});
