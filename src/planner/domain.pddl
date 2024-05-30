;; domain file: domain-deliveroo-0.pddl
(define (domain default)
  (:requirements :strips)
  (:types
    entity position - object
    agent parcel - entity
  )

  (:predicates
    (at ?entity - entity ?position - position)
    (can-move ?from - position ?to - position)
    (carrying ?agent - agent ?parcel - parcel)
    (delivery ?position - position)
    (delivered ?parcel - parcel)
    (blocked  ?position - position)
  )

      (:action move
        :parameters (?agentId - agent ?fr - position ?to - position)
        :precondition (and (at ?agentId ?fr) (can-move ?fr ?to) (not (blocked ?to)))
        :effect (and (not (at ?agentId ?fr)) (at ?agentId ?to) (not (blocked ?fr)) (blocked ?to))
      )
      (:action pickup
        :parameters (?agentId - agent ?position - position)
        :precondition (and (at ?agentId ?position))
        :effect 
        (forall (?p - parcel)
          (when (at ?p ?position)
            (and (carrying ?agentId ?p) (not (at ?p ?position)))
          )
        )
      )
      (:action deliver
        :parameters (?agentId - agent ?position - position)
        :precondition (and (at ?agentId ?position) (delivery ?position))
        :effect 
        (forall (?p - parcel)
          (when (carrying ?agentId ?p)
            (and (not (carrying ?agentId ?p)) (delivered ?p))
          )
        )
      )
      (:action putdown
        :parameters (?agentId - agent ?position - position)
        :precondition (and (at ?agentId ?position))
        :effect 
        (forall (?p - parcel)
          (when (carrying ?agentId ?p)
            (and (not (carrying ?agentId ?p)) (at ?p ?position))
          )
        )
      )
)
