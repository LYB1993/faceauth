import distance as distance
import face_recognition as face_recognition


def check_wink(eye):
    eye_03 = distance.euclidean(eye[0], eye[3])
    eye_15 = distance.euclidean(eye[1], eye[5])
    eye_24 = distance.euclidean(eye[2], eye[4])
    ear = (eye_15 + eye_24) / (2 * eye_03)
    return ear


def compare(file_stream):
    face_found = False
    is_obama = False
    unknow_img = face_recognition.load_image_file(file_stream)
    unknown_face_encodings = face_recognition.face_encodings(unknow_img)
    face_location = face_recognition.face_location(unknow_img)
    return is_obama


if __name__ == '__main__':
    image_file = face_recognition.load_image_file('../picture_14.png')
    locations = face_recognition.face_locations(image_file)
    print(locations[0])
