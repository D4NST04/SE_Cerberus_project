use image::io::Reader as ImageReader;
use ndarray::Array4;
use onnxruntime::{environment::Environment, tensor::OrtOwnedTensor};
use std::error::Error;

fn load_image(path: &str) -> Result<image::RgbImage, Box<dyn Error>> {
    let img = ImageReader::open(path)?.decode()?;
    Ok(img.to_rgb8())
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

pub fn face_embedding(image_path: &str, model_path: &str) -> Result<Vec<f32>, Box<dyn Error>> {
    let img = load_image(image_path)?;
    let input_tensor = preprocess(&img);

    let env = Environment::builder().with_name("face_embed").build()?;

    let mut session = env
        .new_session_builder()?
        .with_model_from_file(model_path)?;

    let _input_name = session.inputs[0].name.clone();
    let outputs: Vec<OrtOwnedTensor<f32, _>> = session.run(vec![input_tensor])?;

    let output = outputs[0].as_slice().unwrap().to_vec();
    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{Rgb, RgbImage};

    #[test]
    fn test_does_the_preprocessor_spew_out_bs() {
        let mut img = RgbImage::new(112, 112);
        for pixel in img.pixels_mut() {
            *pixel = Rgb([255, 0, 0]);
        }

        let tensor = preprocess(&img);

        assert_eq!(tensor.shape(), &[1, 3, 112, 112]);

        let r_val = tensor[[0, 0, 0, 0]];
        let g_val = tensor[[0, 1, 0, 0]];
        let b_val = tensor[[0, 2, 0, 0]];

        assert!(r_val > 0.99 && r_val < 1.0);
        assert!(g_val > -1.0 && g_val < -0.99);
        assert!(b_val > -1.0 && b_val < -0.99);
    }
}
