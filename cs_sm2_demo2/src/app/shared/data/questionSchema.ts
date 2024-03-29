export interface QuestionItem {
    type: string;
    background: string;
    course: string;
    des: string;
    qaPair: QuestionAnswerPair[];
    wrongAnswer: WrongAnswer[];
}

export interface QuestionAnswerPair {
    question: string;
    answer: string;//answer and explanation
}

export interface WrongAnswer{
    content: string;
}

//there should only be two types: multiple choice or definition question
//mc questions have one and only one pair of question-answer and has multiple select options
//df question have zero select and one or more pairs of quesiton-answer 