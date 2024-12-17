from flask import Flask, request, jsonify
from PIL import Image

import numpy as np
import torch

from llama_cpp import Llama
from llama_cpp.llama_chat_format import Llava15ChatHandler

mmproj="mmproj-model-f16.gguf"
model_path="ggml-model-q4_0.gguf"
chat_handler = None
spacellava = None
modelLoaded = False

app = Flask(__name__)

# create a route that will load the model into memory
@app.route('/load_model', methods=['GET'])
def load_model():
    print("Loading model.")
    global chat_handler, spacellava, modelLoaded
    if modelLoaded:
        print("Model already loaded. Please close the model first.")
        return jsonify({"message": "Model is already loaded."})
    chat_handler = Llava15ChatHandler(clip_model_path=mmproj, verbose=True)
    spacellava = Llama(model_path=model_path, chat_handler=chat_handler, n_ctx=2048, logits_all=True, n_gpu_layers = -1)
    modelLoaded = True
    return jsonify({"message": "Model loaded successfully"})

@app.route('/process_image', methods=['POST'])
def process_image():
    print("new request to serve data")
    global spacellava, modelLoaded
    if not modelLoaded:
        print("Model not loaded yet. Please load the model first.")
        return jsonify({"message": "Model not loaded yet. Please load the model first."})
    data = request.get_json()

    # Extract base64 image from the request
    base64_image = data.get('image')
    prompt = data.get('prompt')

    modifiedPrompt = 'Answer this question: '+ prompt + ". Do not mention the image."

    messages = [
        {"role": "system", "content": "You are an assistant for low vision and blind people, who accurately answers question based on the image provided. Make sure to keep it short and precise, but not one word. Note that images are from user's perspective. Please do numerical analysis such as object distances, or dimensions whenever appropriate, for example in task related to navigation or object identifications and tell them that the value is an estimation. If user requests for object detection, try to see if it is in the frame. If not found, analyse the environment and give appropriate instructions, where the user can look for it. If a user reqeusts for directions, first analyse where the user is, and analyse if the target location is in the frame, if not, try to give appropriate instructions after analyzing his current envirnoment so that user can reach the destination in next few frames."},
        {
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": base64_image}},
                {"type" : "text", "text": modifiedPrompt}
            ]
        }
    ]
    results = spacellava.create_chat_completion(messages = messages)

    # return the results
    return jsonify(results)

@app.route('/chat_completion', methods=['POST'])
def chat_completion():
    print("new history data to server")
    global spacellava, modelLoaded
    if not modelLoaded:
        print("Model not loaded yet. Please load the model first.")
        return jsonify({"message": "Model not loaded yet. Please load the model first."})
    data = request.get_json()

    if(len(data)>10):
        data = data[-10:]

    print(data)

    messages = [
        {
            "role": "system", "content": "You are an assistant for low vision and blind people, who accurately answers question based on the image provided. Make sure to keep it short and precise, but not one word. Note that images are from user's perspective. Please do numerical analysis such as object distances, or dimensions whenever appropriate, for example in task related to navigation or object identifications and tell them that the value is an estimation. If user requests for object detection, try to see if it is in the frame. If not found, analyse the environment and give appropriate instructions, where the user can look for it. If a user reqeusts for directions, first analyse where the user is, and analyse if the target location is in the frame, if not, try to give appropriate instructions after analyzing his current envirnoment so that user can reach the destination in next few frames."
        }
    ]
    messages.extend(data)
    print(len(messages))

    results = spacellava.create_chat_completion(messages = messages)

    # return the results
    return jsonify(results)

# create a route that will close the model and free up memory
@app.route('/close_model', methods=['GET'])
def close_model():
    print("closing model")
    global chat_handler, spacellava, modelLoaded
    if not modelLoaded:
        print("Model not loaded yet. Please load the model first.")
        return jsonify({"message": "Model not loaded yet. Please load the model first."})
    chat_handler = None
    spacellava = None
    modelLoaded = False
    return jsonify({"message": "Model closed successfully"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=54345)
