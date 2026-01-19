use image::io::Reader as ImageReader;
use image::{DynamicImage, GenericImageView};
use ndarray::Array4;
use onnxruntime::{environment::Environment, session::SessionBuilder, tensor::OrtOwnedTensor};

fn load_image(path: &str) -> image::RgbImage {
    let img = ImageReader::open(path).unwrap().decode().unwrap();
    img.to_rgb8()
}

fn preprocess(img: &image::RgbImage) -> Array4<f32> {
    let resized = image::imageops::resize(img, 112, 112, image::imageops::FilterType::Triangle);

    let mut arr = Array4::<f32>::zeros((1, 3, 112, 112));

    for (x, y, pixel) in resized.enumerate_pixels() {
        arr[[0, 0, y as usize, x as usize]] = (pixel[0] as f32 - 127.5) / 128.0;
        arr[[0, 1, y as usize, x as usize]] = (pixel[1] as f32 - 127.5) / 128.0;
        arr[[0, 2, y as usize, x as usize]] = (pixel[2] as f32 - 127.5) / 128.0;
    }

    arr
}

fn face_embedding(image_path: &str, model_path: &str) -> Vec<f32> {
    let img = load_image(image_path);
    let input_tensor = preprocess(&img);

    let env = Environment::builder()
        .with_name("face_embed")
        .build()
        .unwrap();

    let mut session = SessionBuilder::new(&env)
        .unwrap()
        .with_model_from_file(model_path)
        .unwrap();

    let input_name = session.inputs[0].name.clone();
    let outputs: Vec<OrtOwnedTensor<f32, _>> = session
        .run(vec![(input_name.as_str(), input_tensor)])
        .unwrap();

    let output = outputs[0].as_slice().unwrap().to_vec();
    output
}

fn main() {
    let image_path = "face.jpg";
    let model_path = "arcface.onnx";

    let embedding = face_embedding(image_path, model_path);
    println!("Embedding len: {}", embedding.len());
    println!("{:?}", &embedding[..10]);
}
