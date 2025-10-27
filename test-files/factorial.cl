;;; factorial.cl - Common Lisp factorial implementation
;;; Demonstrates recursive and iterative approaches

(defun factorial-recursive (n)
  "Calculate factorial of n using recursion"
  (if (<= n 1)
      1
      (* n (factorial-recursive (- n 1)))))

(defun factorial-iterative (n)
  "Calculate factorial of n using iteration"
  (let ((result 1))
    (loop for i from 2 to n
          do (setf result (* result i)))
    result))

;; Test the functions
(format t "Recursive: factorial(5) = ~a~%" (factorial-recursive 5))
(format t "Iterative: factorial(5) = ~a~%" (factorial-iterative 5))

;; Calculate factorial of numbers 1 through 10
(format t "~%Factorials 1-10:~%")
(loop for i from 1 to 10
      do (format t "~2d! = ~10d~%" i (factorial-recursive i)))
