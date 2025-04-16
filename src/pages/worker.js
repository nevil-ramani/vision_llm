import {
  Florence2ForConditionalGeneration,
  AutoProcessor,
  AutoTokenizer,
  RawImage,
  full,
} from "@huggingface/transformers";

async function hasFp16() {
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter.features.has("shader-f16");
  } catch {
    return false;
  }
}

class Florence2Singleton {
  static model_id = "onnx-community/Florence-2-base-ft";

  static async getInstance(progress_callback = null) {
    this.processor ??= AutoProcessor.from_pretrained(this.model_id);
    this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id);

    this.supports_fp16 ??= await hasFp16();
    this.model ??= Florence2ForConditionalGeneration.from_pretrained(
      this.model_id,
      {
        dtype: {
          embed_tokens: this.supports_fp16 ? "fp16" : "fp32",
          vision_encoder: this.supports_fp16 ? "fp16" : "fp32",
          encoder_model: "q4",
          decoder_model_merged: "q4",
        },
        device: "webgpu",
        progress_callback,
      },
    );

    return Promise.all([this.model, this.tokenizer, this.processor]);
  }
}

async function load() {
  self.postMessage({
    status: "loading",
    data: "Loading model...",
  });

  const [model, tokenizer] = await Florence2Singleton.getInstance((x) => {
    self.postMessage(x);
  });

  const loadingMessages = [
    "Starting AI initialization ✨",
    "Optimizing shaders for performance 🚀",
    "Warming up model 🔥",
    "Preparing model for action ⚙️",
    "Setting up the model architecture 🏗️",
    "Finalizing setup, almost ready 🛠️",
  ];

  for (const message of loadingMessages) {
    self.postMessage({
      status: "loading",
      data: message,
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const text_inputs = tokenizer("a");
  const pixel_values = full([1, 3, 768, 768], 0.0);

  await model.generate({
    ...text_inputs,
    pixel_values,
    max_new_tokens: 1,
  });

  self.postMessage({ status: "ready" });
}

const TASKS_WITH_INPUTS = ["<CAPTION_TO_PHRASE_GROUNDING>"];

let vision_inputs;
let image_size;
async function run({ text, url, task }) {
  const [model, tokenizer, processor] = await Florence2Singleton.getInstance();

  const start = performance.now();
  if (!vision_inputs) {
    const image = await RawImage.fromURL(url);
    image_size = image.size;
    vision_inputs = await processor(image);
  }

  let user_input = task;
  if (TASKS_WITH_INPUTS.includes(task) && text) {
    user_input += text;
  }
  const prompts = processor.construct_prompts(user_input);
  const text_inputs = tokenizer(prompts);

  const generated_ids = await model.generate({
    ...text_inputs,
    ...vision_inputs,
    max_new_tokens: 256,
    num_beams: 1,
    do_sample: false,
  });

  const generated_text = tokenizer.batch_decode(generated_ids, {
    skip_special_tokens: false,
  })[0];

  const result = processor.post_process_generation(
    generated_text,
    task,
    image_size,
  );

  const end = performance.now();

  self.postMessage({ status: "complete", result, time: end - start });
}

self.addEventListener("message", async (e) => {
  const { type, data } = e.data;

  switch (type) {
    case "load":
      load();
      break;

    case "run":
      run(data);
      break;

    case "reset":
      vision_inputs = image_size = null;
      break;
  }
});
