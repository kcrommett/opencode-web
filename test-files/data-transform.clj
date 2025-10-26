;; data-transform.clj - Data transformation examples in Clojure
;; Demonstrates functional programming patterns

(ns data-transform.core
  (:require [clojure.string :as str]))

;; Sample data
(def users
  [{:id 1 :name "Alice" :age 30 :email "alice@example.com" :active true}
   {:id 2 :name "Bob" :age 25 :email "bob@example.com" :active false}
   {:id 3 :name "Charlie" :age 35 :email "charlie@example.com" :active true}
   {:id 4 :name "Diana" :age 28 :email "diana@example.com" :active true}
   {:id 5 :name "Eve" :age 32 :email "eve@example.com" :active false}])

;; Transformation functions
(defn active-users
  "Get all active users"
  [users]
  (filter :active users))

(defn user-names
  "Extract user names"
  [users]
  (map :name users))

(defn average-age
  "Calculate average age of users"
  [users]
  (let [ages (map :age users)
        sum (reduce + ages)
        count (count ages)]
    (double (/ sum count))))

(defn group-by-status
  "Group users by active status"
  [users]
  (group-by :active users))

(defn format-user
  "Format user info as string"
  [user]
  (str (:name user) " <" (:email user) "> (Age: " (:age user) ")"))

(defn users-summary
  "Generate a summary of users"
  [users]
  {:total-count (count users)
   :active-count (count (active-users users))
   :average-age (average-age users)
   :names (user-names users)})

;; Threading macros examples
(defn get-active-user-names
  "Get names of active users using threading"
  [users]
  (->> users
       (filter :active)
       (map :name)
       (sort)))

(defn update-email-domain
  "Update email domain for all users"
  [users new-domain]
  (map #(update % :email
                (fn [email]
                  (str (first (str/split email #"@"))
                       "@" new-domain)))
       users))

;; Higher-order function example
(defn transform-users
  "Apply a series of transformations to users"
  [users & transformations]
  (reduce (fn [data transform-fn]
            (transform-fn data))
          users
          transformations))

;; Example usage
(println "=== User Data Transformations ===\n")

(println "All users:")
(doseq [user users]
  (println "  " (format-user user)))

(println "\nActive users:")
(doseq [name (get-active-user-names users)]
  (println "  " name))

(println "\nUsers summary:")
(let [summary (users-summary users)]
  (println "  Total users:" (:total-count summary))
  (println "  Active users:" (:active-count summary))
  (println "  Average age:" (format "%.1f" (:average-age summary))))

(println "\nGrouped by status:")
(let [grouped (group-by-status users)]
  (println "  Active:" (count (get grouped true)))
  (println "  Inactive:" (count (get grouped false))))

;; Demonstrate threading and composition
(println "\nTransformed users (new domain + active only):")
(->> users
     (update-email-domain "newcompany.com")
     (filter :active)
     (map format-user)
     (run! #(println "  " %)))
