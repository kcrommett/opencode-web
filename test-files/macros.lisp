;;; macros.lisp - Common Lisp macros demonstration
;;; Shows the power of Lisp's macro system

;; Simple macro: unless (opposite of when)
(defmacro unless (condition &body body)
  "Execute body when condition is false"
  `(if (not ,condition)
       (progn ,@body)))

;; Example usage of unless
(unless (> 3 5)
  (format t "3 is not greater than 5~%"))

;; While loop macro
(defmacro while (condition &body body)
  "Execute body repeatedly while condition is true"
  `(loop while ,condition
         do (progn ,@body)))

;; Example usage of while
(let ((i 0))
  (while (< i 5)
    (format t "Count: ~a~%" i)
    (incf i)))

;; Timing macro
(defmacro time-it (form)
  "Time the execution of a form and print the result"
  (let ((start (gensym))
        (end (gensym))
        (result (gensym)))
    `(let* ((,start (get-internal-real-time))
            (,result ,form)
            (,end (get-internal-real-time)))
       (format t "Execution time: ~,3f seconds~%"
               (/ (- ,end ,start) internal-time-units-per-second))
       ,result)))

;; Example usage of time-it
(time-it
 (let ((sum 0))
   (loop for i from 1 to 1000000
         do (incf sum i))
   sum))

;; Memoization macro
(defmacro defun-memoized (name args &body body)
  "Define a memoized function"
  (let ((cache (gensym "CACHE-")))
    `(let ((,cache (make-hash-table :test 'equal)))
       (defun ,name ,args
         (let ((key (list ,@args)))
           (or (gethash key ,cache)
               (setf (gethash key ,cache)
                     (progn ,@body))))))))

;; Example: memoized fibonacci
(defun-memoized fib (n)
  (if (<= n 1)
      n
      (+ (fib (- n 1)) (fib (- n 2)))))

(format t "~%Fibonacci numbers (memoized):~%")
(loop for i from 0 to 20
      do (format t "fib(~2d) = ~10d~%" i (fib i)))

;; With-gensyms macro (common utility)
(defmacro with-gensyms (syms &body body)
  "Create gensyms for the given symbols"
  `(let ,(loop for s in syms collect `(,s (gensym)))
     ,@body))

;; Anaphoric if macro (uses 'it' for the condition result)
(defmacro aif (condition then &optional else)
  "Anaphoric if: binds 'it' to the condition result"
  `(let ((it ,condition))
     (if it ,then ,else)))

;; Example of aif
(aif (find 42 '(1 2 42 3 4))
     (format t "Found at position: ~a~%" (position 42 '(1 2 42 3 4)))
     (format t "Not found~%"))

;; Do-tuples macro (iterate over tuples)
(defmacro do-tuples (params list &body body)
  "Iterate over tuples of elements from list"
  (let ((list-var (gensym)))
    `(let ((,list-var ,list))
       (loop while (>= (length ,list-var) ,(length params))
             do (destructuring-bind ,params ,list-var
                  ,@body
                  (setf ,list-var (nthcdr ,(length params) ,list-var)))))))

;; Example of do-tuples
(format t "~%Processing tuples:~%")
(do-tuples (a b c) '(1 2 3 4 5 6 7 8 9)
  (format t "Tuple: ~a, ~a, ~a - Sum: ~a~%" a b c (+ a b c)))

;; With-slots-like macro for property access
(defmacro with-accessors-for (obj accessors &body body)
  "Simplified version of with-accessors"
  `(symbol-macrolet
       ,(loop for (var accessor) in accessors
              collect `(,var (,accessor ,obj)))
     ,@body))

;; Assert macro with custom message
(defmacro assert-that (condition &optional (message "Assertion failed"))
  "Assert with custom error message"
  `(unless ,condition
     (error ,message)))

;; Thread-first macro (like Clojure's ->)
(defmacro -> (x &rest forms)
  "Thread x through forms, inserting as first argument"
  (if forms
      (let ((form (car forms)))
        (if (listp form)
            `(-> ,(append form (list x)) ,@(cdr forms))
            `(-> (,form ,x) ,@(cdr forms))))
      x))

;; Example of ->
(format t "~%Thread-first example:~%")
(format t "Result: ~a~%" (-> 5 (+ 3) (* 2) (- 1)))

;; Pattern matching macro (simplified)
(defmacro match (value &rest clauses)
  "Simple pattern matching"
  (let ((val (gensym)))
    `(let ((,val ,value))
       (cond
         ,@(loop for (pattern body) in clauses
                 collect `((equal ,val ,pattern) ,body))
         (t (error "No matching pattern"))))))

;; Example of match
(defun describe-number (n)
  (match n
    (0 "zero")
    (1 "one")
    (2 "two")
    (t "many")))

(format t "~%Pattern matching:~%")
(loop for i from 0 to 4
      do (format t "~a -> ~a~%" i (describe-number i)))
