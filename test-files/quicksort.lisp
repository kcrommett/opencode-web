;;; quicksort.lisp - Common Lisp quicksort implementation
;;; Classic divide-and-conquer sorting algorithm

(defun quicksort (list)
  "Sort a list using the quicksort algorithm"
  (when list
    (let ((pivot (car list))
          (rest (cdr list)))
      (append
       (quicksort (remove-if-not #'(lambda (x) (< x pivot)) rest))
       (list pivot)
       (quicksort (remove-if-not #'(lambda (x) (>= x pivot)) rest))))))

;; Helper function to generate random list
(defun random-list (n &optional (max 100))
  "Generate a list of n random numbers between 0 and max"
  (loop repeat n collect (random max)))

;; Test the quicksort function
(let ((unsorted '(64 34 25 12 22 11 90)))
  (format t "Original list: ~a~%" unsorted)
  (format t "Sorted list:   ~a~%" (quicksort unsorted)))

(format t "~%Random list test:~%")
(let ((random-nums (random-list 15 100)))
  (format t "Unsorted: ~a~%" random-nums)
  (format t "Sorted:   ~a~%" (quicksort random-nums)))
