from scipy.spatial import distance
import face_recognition as face_recognition


def check_wink(eye):
    eye_03 = distance.euclidean(eye[0], eye[3])
    eye_15 = distance.euclidean(eye[1], eye[5])
    eye_24 = distance.euclidean(eye[2], eye[4])
    ear = (eye_15 + eye_24) / (2 * eye_03)
    return ear


def check_head():
    return 0.2


def check_mouth(mouth):
    euclidean = distance.euclidean(mouth[0], mouth[1])
    distance.euclidean(mouth[2], mouth[3])
    distance.euclidean(mouth[4], mouth[5])
    distance.euclidean(mouth[6], mouth[7])
    return 0.1


def clear_face_cache(index, known_face_arrays):
    del known_face_arrays[index]



if __name__ == '__main__':
    print(type(bool('False')))
